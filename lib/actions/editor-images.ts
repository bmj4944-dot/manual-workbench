"use server";

import { requirePermission, requireProfile } from "./_helpers";

const BUCKET = "documents-attachments";
const PREFIX = "_editor"; // separates inline-editor images from user attachments

const MAX_BYTES = 8 * 1024 * 1024; // 8MB — Vercel function payload cap is 4.5MB
//                                   but with serverActions.bodySizeLimit = 10mb
//                                   we have headroom locally. Reject anything
//                                   bigger before Storage upload.
const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
]);

export type EditorImageUpload = {
  path: string; // raw storage path (e.g. "_editor/<docId>/<uuid>.png")
  url: string;  // ready-to-use src for an <img> tag
};

/**
 * Uploads a drag-dropped editor image to Storage and returns the URL the
 * client should use in the document HTML. We never expose Storage public URLs
 * directly (the bucket is private); the returned URL points at our own
 * `/api/editor-images/...` route which streams the file to authenticated
 * users with proper headers. Path collisions are avoided via a UUID.
 */
export async function uploadEditorImageAction(
  documentId: string,
  formData: FormData,
): Promise<EditorImageUpload> {
  const { supabase, role } = await requireProfile();
  requirePermission(role, "edit");

  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("missing file");
  if (file.size > MAX_BYTES) {
    throw new Error(
      `이미지 크기가 너무 큽니다 (${(file.size / 1024 / 1024).toFixed(1)}MB / 8MB 제한)`,
    );
  }
  const mime = file.type || "application/octet-stream";
  if (!ALLOWED.has(mime)) {
    throw new Error(`지원하지 않는 이미지 형식: ${mime}`);
  }

  // ASCII-only path. Extension derived from mime so name normalization isn't
  // sensitive to weird filenames (e.g. screenshot pastes with no extension).
  const extByMime: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/svg+xml": "svg",
  };
  const ext = extByMime[mime] ?? "bin";
  const uuid = crypto.randomUUID();
  const path = `${PREFIX}/${documentId}/${uuid}.${ext}`;

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: mime,
    upsert: false,
  });
  if (upErr) throw upErr;

  return { path, url: `/api/editor-images/${path}` };
}
