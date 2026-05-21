import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Attachment } from "@/lib/types";

type Row = {
  id: string;
  document_id: string;
  file_name: string;
  file_size: number;
  mime_type: string | null;
  storage_path: string;
  uploaded_at: string;
  uploader: { name: string } | null;
};

/**
 * Returns attachments grouped by document_id for the *whole* tree.
 * The volume is small (a few files per doc, dozens of docs); fetching once
 * keeps the client logic simple — `byDoc[nodeId]` gives the list.
 */
export async function fetchAttachments(): Promise<
  Record<string, Attachment[]>
> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("attachments")
    .select(
      `
        id, document_id, file_name, file_size, mime_type, storage_path,
        uploaded_at,
        uploader:profiles!uploader_id(name)
      `,
    )
    .order("uploaded_at", { ascending: false });
  if (error) throw error;

  const out: Record<string, Attachment[]> = {};
  for (const r of (data ?? []) as unknown as Row[]) {
    const a: Attachment = {
      id: r.id,
      documentId: r.document_id,
      fileName: r.file_name,
      fileSize: r.file_size,
      mimeType: r.mime_type,
      storagePath: r.storage_path,
      uploaderName: r.uploader?.name ?? "—",
      uploadedAt: r.uploaded_at,
    };
    if (!out[r.document_id]) out[r.document_id] = [];
    out[r.document_id].push(a);
  }
  return out;
}
