"use server";

import { createClient } from "@/lib/supabase/server";

export type PageStatKind = "view" | "copy" | "search";

/**
 * Fire-and-forget bump for the document's view/copy/search counter.
 *
 * - Calls the SECURITY DEFINER `record_page_stat` RPC (see migration 0014)
 *   so atomic +1 + RLS sidestep happens in one DB round-trip.
 * - Silently no-ops for unauthenticated callers — these are usage metrics,
 *   not actions, so an anonymous visitor hitting the page shouldn't crash.
 * - Does NOT revalidatePath: numbers refresh on the next data fetch. Hot
 *   pages would otherwise revalidate on every keystroke (search) or focus
 *   change (view), which is too aggressive for a background metric.
 */
export async function recordPageStatAction(
  documentId: string,
  kind: PageStatKind,
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.rpc("record_page_stat", {
    p_doc_id: documentId,
    p_kind: kind,
  });
  // Don't throw — metric writes shouldn't surface failures to the user. A
  // console.error is enough for the developer to spot if the RPC isn't
  // wired up yet (migration 0014 not applied).
  if (error) console.error("recordPageStatAction failed", error);
}
