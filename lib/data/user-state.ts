import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Returns favorite document_ids for the current authenticated user.
 * Returns empty array if no session.
 */
export async function fetchFavorites(): Promise<string[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!profile) return [];

  const { data, error } = await supabase
    .from("favorites")
    .select("document_id")
    .eq("user_id", (profile as { id: string }).id);
  if (error) throw error;
  return (data ?? []).map((r) => (r as { document_id: string }).document_id);
}

/**
 * Returns must-read document_ids acknowledged by the current user.
 */
export async function fetchAckedIds(): Promise<string[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!profile) return [];

  const { data, error } = await supabase
    .from("compliance_records")
    .select("document_id")
    .eq("user_id", (profile as { id: string }).id);
  if (error) throw error;
  return (data ?? []).map((r) => (r as { document_id: string }).document_id);
}
