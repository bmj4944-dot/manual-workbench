"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "./_helpers";

// Uploads moved to lib/actions/uploads.ts (signed-URL / direct-to-Storage
// pattern, to bypass Vercel's 4.5MB function payload cap).

const BUCKET = "documents-attachments";

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
