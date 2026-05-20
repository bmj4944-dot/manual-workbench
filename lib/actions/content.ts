"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, requireProfile } from "./_helpers";

/**
 * Saves the body for a document (autosave path). UPSERTs into
 * document_content so docs that never had content yet get a fresh row.
 * Requires the 'edit' permission.
 */
export async function saveBodyAction(documentId: string, html: string) {
  const { supabase, profileId, role } = await requireProfile();
  requirePermission(role, "edit");

  const { error } = await supabase
    .from("document_content")
    .upsert(
      {
        document_id: documentId,
        body: html,
        author_id: profileId,
      },
      { onConflict: "document_id" },
    );
  if (error) throw error;
  revalidatePath("/");
}

/**
 * Appends a new version row for a document. The body is whatever caller
 * snapshots — typically the just-saved body, or an explicit "save version"
 * action. Requires 'edit'.
 */
export async function pushVersionAction(
  documentId: string,
  body: string,
  description: string,
  tag?: "approved" | "published",
) {
  const { supabase, profileId, role } = await requireProfile();
  requirePermission(role, "edit");

  // Compute next version label: bump 0.1 off the most recent label.
  const { data: head } = await supabase
    .from("document_versions")
    .select("version_label")
    .eq("document_id", documentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastLabel = (head as { version_label?: string } | null)?.version_label;
  const lastNum = lastLabel ? parseFloat(lastLabel.replace(/^v/, "")) : 1.0;
  const nextLabel = `v${(lastNum + 0.1).toFixed(1)}`;

  const { error } = await supabase.from("document_versions").insert({
    document_id: documentId,
    version_label: nextLabel,
    author_id: profileId,
    description,
    body,
    tag: tag ?? null,
  });
  if (error) throw error;
  revalidatePath("/");
}
