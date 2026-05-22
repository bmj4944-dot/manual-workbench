"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "./_helpers";

export async function addCommentAction(
  documentId: string,
  body: string,
  parentId?: string | null,
) {
  const trimmed = body.trim();
  if (!trimmed) throw new Error("empty comment");
  const { supabase, profileId } = await requireProfile();

  // Single-level threading: if the requested parent itself has a parent,
  // flatten the reply onto the original root. Keeps the UI a strict 2-level
  // tree without adding DB constraints we'd later have to drop.
  let resolvedParent: string | null = null;
  if (parentId) {
    const { data: parent, error: parentErr } = await supabase
      .from("comments")
      .select("id, parent_comment_id, document_id")
      .eq("id", parentId)
      .maybeSingle();
    if (parentErr) throw parentErr;
    if (!parent) throw new Error("parent comment not found");
    const p = parent as {
      id: string;
      parent_comment_id: string | null;
      document_id: string;
    };
    if (p.document_id !== documentId) {
      throw new Error("parent comment belongs to a different document");
    }
    resolvedParent = p.parent_comment_id ?? p.id;
  }

  const { data: inserted, error } = await supabase
    .from("comments")
    .insert({
      document_id: documentId,
      author_id: profileId,
      body: trimmed,
      resolved: false,
      parent_comment_id: resolvedParent,
    })
    .select("id, parent_comment_id")
    .single();
  if (error) throw error;
  revalidatePath("/");
  return {
    id: (inserted as { id: string }).id,
    parentId: (inserted as { parent_comment_id: string | null }).parent_comment_id,
  };
}

export async function toggleResolveCommentAction(
  commentId: string,
  resolved: boolean,
) {
  const { supabase } = await requireProfile();
  const { error } = await supabase
    .from("comments")
    .update({ resolved })
    .eq("id", commentId);
  if (error) throw error;
  revalidatePath("/");
}
