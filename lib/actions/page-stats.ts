"use server";

import { createClient } from "@/lib/supabase/server";

export type PageStatKind = "view" | "copy" | "search";

export type PageStatResult =
  | { ok: true }
  | { ok: false; reason: string };

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
 *
 * Returns a discriminated result for *diagnostic* purposes: while we're
 * debugging silent failures we surface non-ok results to the client via
 * toast. Once stable this can go back to plain `void`.
 */
export async function recordPageStatAction(
  documentId: string,
  kind: PageStatKind,
): Promise<PageStatResult> {
  const supabase = createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr) return { ok: false, reason: `auth: ${authErr.message}` };
  if (!user) return { ok: false, reason: "no-user" };

  const { error } = await supabase.rpc("record_page_stat", {
    p_doc_id: documentId,
    p_kind: kind,
  });
  if (error) {
    console.error("recordPageStatAction failed", error);
    return { ok: false, reason: `${error.code ?? "rpc"}: ${error.message}` };
  }
  return { ok: true };
}
