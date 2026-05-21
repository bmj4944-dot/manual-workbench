"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, requireProfile } from "./_helpers";

const BUCKET = "documents-attachments";

type UploadResult = {
  id: string;
  documentId: string;
  fileName: string;
  fileSize: number;
  mimeType: string | null;
  storagePath: string;
  uploaderName: string;
  uploadedAt: string;
};

export async function uploadAttachmentAction(
  documentId: string,
  formData: FormData,
): Promise<UploadResult> {
  const { supabase, profileId, role } = await requireProfile();
  requirePermission(role, "edit");

  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("missing file");

  // Random storage path under <doc_id>/<uuid>-<safe-name>
  const id = crypto.randomUUID();
  const safe = file.name.replace(/[^\w.\-]+/g, "_").slice(0, 80);
  const storagePath = `${documentId}/${id}-${safe}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
  if (upErr) throw upErr;

  const { data: row, error: insErr } = await supabase
    .from("attachments")
    .insert({
      id,
      document_id: documentId,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type || null,
      storage_path: storagePath,
      uploader_id: profileId,
    })
    .select(
      "id, document_id, file_name, file_size, mime_type, storage_path, uploaded_at",
    )
    .single();
  if (insErr) {
    // Rollback storage on DB failure
    await supabase.storage.from(BUCKET).remove([storagePath]);
    throw insErr;
  }

  // Look up uploader name for client display
  const { data: prof } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", profileId)
    .maybeSingle();

  revalidatePath("/");

  return {
    id: row.id,
    documentId: row.document_id,
    fileName: row.file_name,
    fileSize: row.file_size,
    mimeType: row.mime_type,
    storagePath: row.storage_path,
    uploaderName: (prof as { name?: string } | null)?.name ?? "—",
    uploadedAt: row.uploaded_at,
  };
}

export async function deleteAttachmentAction(attachmentId: string) {
  const { supabase } = await requireProfile();

  // Look up storage path first (RLS allows us to read our own).
  const { data: row, error: readErr } = await supabase
    .from("attachments")
    .select("storage_path")
    .eq("id", attachmentId)
    .maybeSingle();
  if (readErr) throw readErr;
  if (!row) throw new Error("attachment not found");

  // Delete the row (RLS gates by uploader or admin/reviewer role)
  const { error: delErr } = await supabase
    .from("attachments")
    .delete()
    .eq("id", attachmentId);
  if (delErr) throw delErr;

  // Best-effort storage cleanup
  await supabase.storage
    .from(BUCKET)
    .remove([(row as { storage_path: string }).storage_path]);

  revalidatePath("/");
}
