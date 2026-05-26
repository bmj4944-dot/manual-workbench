"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, requireProfile } from "./_helpers";

/**
 * Replaces the tag list on a document. UPSERT so docs without a content row
 * yet still get one. Requires 'edit'.
 */
export async function updateTagsAction(documentId: string, tags: string[]) {
  const { supabase, role } = await requireProfile();
  requirePermission(role, "edit");

  const cleaned = Array.from(
    new Set(
      tags
        .map((t) => t.trim())
        .filter((t) => t.length > 0 && t.length <= 32),
    ),
  ).slice(0, 24);

  const { error } = await supabase
    .from("document_content")
    .upsert(
      { document_id: documentId, tags: cleaned },
      { onConflict: "document_id" },
    );
  if (error) throw error;
  revalidatePath("/");
}
