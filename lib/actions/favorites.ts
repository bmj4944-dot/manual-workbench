"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "./_helpers";

export async function addFavoriteAction(documentId: string) {
  const { supabase, profileId } = await requireProfile();
  const { error } = await supabase
    .from("favorites")
    .insert({ user_id: profileId, document_id: documentId });
  if (error && error.code !== "23505") throw error; // 23505 = unique violation, idempotent
  revalidatePath("/");
}

export async function removeFavoriteAction(documentId: string) {
  const { supabase, profileId } = await requireProfile();
  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("user_id", profileId)
    .eq("document_id", documentId);
  if (error) throw error;
  revalidatePath("/");
}
