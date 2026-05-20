"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "./_helpers";

export async function addCommentAction(documentId: string, body: string) {
  const trimmed = body.trim();
  if (!trimmed) throw new Error("empty comment");
  const { supabase, profileId } = await requireProfile();
  const { error } = await supabase.from("comments").insert({
    document_id: documentId,
    author_id: profileId,
    body: trimmed,
    resolved: false,
  });
  if (error) throw error;
  revalidatePath("/");
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
