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
  // DIAGNOSTIC (C-4-debug): structured log so we can grep Vercel Function
  // Logs for "[page-stat]" to confirm the action is actually being invoked.
  console.log("[page-stat] action invoked", { documentId, kind });
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    console.log("[page-stat] short-circuit: no user");
    return { ok: false, reason: "no-user" } as const;
  }

  const { error } = await supabase.rpc("record_page_stat", {
    p_doc_id: documentId,
    p_kind: kind,
  });
  if (error) {
    console.error("[page-stat] rpc error", error);
    return { ok: false, reason: error.message ?? "rpc" } as const;
  }
  console.log("[page-stat] ok", { documentId, kind });
  return { ok: true } as const;
}
