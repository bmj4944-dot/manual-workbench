"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "./_helpers";

export async function acknowledgeMustReadAction(documentId: string) {
  const { supabase, profileId } = await requireProfile();
  const { error } = await supabase
    .from("compliance_records")
    .insert({ user_id: profileId, document_id: documentId });
  if (error && error.code !== "23505") throw error;
  revalidatePath("/");
}
