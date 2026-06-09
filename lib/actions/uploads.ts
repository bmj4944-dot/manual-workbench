"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, requireProfile } from "./_helpers";
import { rateLimitThrow } from "./_rate-limit";

// ─── Limits and mime whitelists ──────────────────────────────────────
// Vercel function payload cap (4.5MB) is the reason this whole module
// exists — by handing the browser a signed upload URL we bypass it. The
// limits below are *server-side guardrails*, not Vercel limits.

const MAX_PDF_BYTES = 50 * 1024 * 1024;
const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
const MAX_EDITOR_IMAGE_BYTES = 8 * 1024 * 1024;

const ALLOWED_IMAGE_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
]);

const PDF_BUCKET = "documents-pdf";
const ATTACH_BUCKET = "documents-attachments";
const EDITOR_PREFIX = "_editor";

// ─── Request / response types ────────────────────────────────────────

export type SignedUploadRequest =
  | { kind: "pdf"; documentId: string; fileSize: number }
  | {
      kind: "attachment";
      documentId: string;
      fileName: string;
      fileSize: number;
      mimeType: string;
    }
  | {
      kind: "editor-image";
      documentId: string;
      fileSize: number;
      mimeType: string;
    };

export type SignedUploadGrant = {
  bucket: string;
  path: string;
  token: string;
  upsert: boolean;
};

// ─── createUploadSignedUrlAction ─────────────────────────────────────

/**
 * Validates the request (role / size / mime / file kind) and returns a
 * signed upload URL the browser can PUT to directly. The DB row (if any)
 * is created in a separate "finalize" action *after* the upload succeeds.
 *
 * Why direct-to-Storage: Vercel functions cap request payloads at 4.5MB
 * — large PDFs were silently failing with "undefined" return values. The
 * browser uploading straight to Supabase Storage avoids that hop.
 */
export async function createUploadSignedUrlAction(
  req: SignedUploadRequest,
): Promise<SignedUploadGrant> {
  const { supabase, role, profileId } = await requireProfile();
  requirePermission(role, "edit");

  // 업로드 URL 발급 폭주 방지 — 스토리지 남용 차단 (그룹 5-B).
  await rateLimitThrow(profileId, "upload.sign", 30, 60_000);

  if (req.kind === "pdf") {
    if (req.fileSize > MAX_PDF_BYTES) {
      throw new Error(
        `PDF가 너무 큽니다 (${(req.fileSize / 1024 / 1024).toFixed(1)}MB / ${
          MAX_PDF_BYTES / 1024 / 1024
        }MB 제한)`,
      );
    }
    const path = `${req.documentId}.pdf`;
    const { data, error } = await supabase.storage
      .from(PDF_BUCKET)
      .createSignedUploadUrl(path, { upsert: true });
    if (error || !data) throw error ?? new Error("signed url 발급 실패");
    return {
      bucket: PDF_BUCKET,
      path,
      token: data.token,
      upsert: true,
    };
  }

  if (req.kind === "editor-image") {
    if (req.fileSize > MAX_EDITOR_IMAGE_BYTES) {
      throw new Error(
        `이미지가 너무 큽니다 (${(req.fileSize / 1024 / 1024).toFixed(1)}MB / ${
          MAX_EDITOR_IMAGE_BYTES / 1024 / 1024
        }MB 제한)`,
      );
    }
    if (!ALLOWED_IMAGE_MIME.has(req.mimeType)) {
      throw new Error(`지원하지 않는 이미지 형식: ${req.mimeType}`);
    }
    const extByMime: Record<string, string> = {
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/gif": "gif",
      "image/webp": "webp",
      "image/svg+xml": "svg",
    };
    const ext = extByMime[req.mimeType] ?? "bin";
    const uuid = crypto.randomUUID();
    const path = `${EDITOR_PREFIX}/${req.documentId}/${uuid}.${ext}`;
    const { data, error } = await supabase.storage
      .from(ATTACH_BUCKET)
      .createSignedUploadUrl(path);
    if (error || !data) throw error ?? new Error("signed url 발급 실패");
    return { bucket: ATTACH_BUCKET, path, token: data.token, upsert: false };
  }

  // kind === "attachment"
  if (req.fileSize > MAX_ATTACHMENT_BYTES) {
    throw new Error(
      `첨부 파일이 너무 큽니다 (${(req.fileSize / 1024 / 1024).toFixed(1)}MB / ${
        MAX_ATTACHMENT_BYTES / 1024 / 1024
      }MB 제한)`,
    );
  }
  const id = crypto.randomUUID();
  const extMatch = req.fileName.match(/\.([A-Za-z0-9]{1,8})$/);
  const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : "";
  const path = `${req.documentId}/${id}${ext}`;
  const { data, error } = await supabase.storage
    .from(ATTACH_BUCKET)
    .createSignedUploadUrl(path);
  if (error || !data) throw error ?? new Error("signed url 발급 실패");
  return { bucket: ATTACH_BUCKET, path, token: data.token, upsert: false };
}

// ─── finalize actions ────────────────────────────────────────────────

export type FinalizeAttachmentResult = {
  id: string;
  documentId: string;
  fileName: string;
  fileSize: number;
  mimeType: string | null;
  storagePath: string;
  uploaderName: string;
  uploadedAt: string;
};

export async function finalizeAttachmentAction(input: {
  documentId: string;
  storagePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string | null;
}): Promise<FinalizeAttachmentResult> {
  const { supabase, profileId, role } = await requireProfile();
  requirePermission(role, "edit");

  // The path was generated server-side as `<docId>/<uuid>.<ext>`. Defensive
  // check: reject anything claiming to belong to a different document or
  // pointing inside the `_editor/` editor-image prefix.
  if (
    !input.storagePath.startsWith(`${input.documentId}/`) ||
    input.storagePath.startsWith("_editor/")
  ) {
    throw new Error("storagePath가 documentId와 일치하지 않습니다.");
  }

  // Derive `id` from the path so we don't insert a different row than the
  // signed URL was issued for.
  const baseName = input.storagePath.split("/").pop() ?? "";
  const id = baseName.replace(/\.[^.]+$/, "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    throw new Error("storagePath의 파일명이 UUID 형식이 아닙니다.");
  }

  const { data: row, error: insErr } = await supabase
    .from("attachments")
    .insert({
      id,
      document_id: input.documentId,
      file_name: input.fileName,
      file_size: input.fileSize,
      mime_type: input.mimeType,
      storage_path: input.storagePath,
      uploader_id: profileId,
    })
    .select(
      "id, document_id, file_name, file_size, mime_type, storage_path, uploaded_at",
    )
    .single();
  if (insErr) {
    // Storage already received the file; best-effort cleanup so we don't leak.
    await supabase.storage.from(ATTACH_BUCKET).remove([input.storagePath]);
    throw insErr;
  }

  const { data: prof } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", profileId)
    .maybeSingle();

  revalidatePath("/");

  return {
    id: row.id,
    documentId: row.document_id,
    fileName: input.fileName,
    fileSize: row.file_size,
    mimeType: row.mime_type,
    storagePath: row.storage_path,
    uploaderName: (prof as { name?: string } | null)?.name ?? "—",
    uploadedAt: row.uploaded_at,
  };
}

export async function finalizePdfAction(input: {
  documentId: string;
  storagePath: string;
  pageCount?: number | null;
}): Promise<void> {
  const { supabase, profileId, role } = await requireProfile();
  requirePermission(role, "edit");

  if (input.storagePath !== `${input.documentId}.pdf`) {
    throw new Error("storagePath가 documentId.pdf와 일치하지 않습니다.");
  }

  const { error: updErr } = await supabase
    .from("document_content")
    .upsert(
      {
        document_id: input.documentId,
        pdf_storage_path: input.storagePath,
        author_id: profileId,
        ...(input.pageCount && Number.isFinite(input.pageCount)
          ? { pdf_pages: input.pageCount }
          : {}),
      },
      { onConflict: "document_id" },
    );
  if (updErr) throw updErr;

  const { error: badgeErr } = await supabase
    .from("documents")
    .update({ badge: "PDF" })
    .eq("id", input.documentId);
  if (badgeErr) throw badgeErr;

  revalidatePath("/");
}

/**
 * Editor inline images don't need a DB row — the path is used directly in
 * the document body HTML. We still expose this action so callers have a
 * consistent way to obtain the served URL (and so we can add DB tracking
 * later without changing the call sites).
 */
export async function finalizeEditorImageAction(input: {
  storagePath: string;
}): Promise<{ url: string }> {
  // Defensive: only editor-image paths.
  if (!input.storagePath.startsWith(`${EDITOR_PREFIX}/`)) {
    throw new Error("editor-image 경로 형식이 아닙니다.");
  }
  return { url: `/api/editor-images/${input.storagePath}` };
}
