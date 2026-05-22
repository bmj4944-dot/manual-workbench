"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, requireProfile } from "./_helpers";

// Default interval used when a document is verified for the very first
// time (no row in `verifications` yet). 90 days matches what manual2's
// sample data trends toward; admins can tune per-doc later.
const DEFAULT_INTERVAL_DAYS = 90;

export type ReverifyResult = {
  documentId: string;
  lastVerifiedAt: string;
  intervalDays: number;
  by: string;
};

/**
 * Marks a document as freshly re-verified by the current user. Updates the
 * existing row's last_verified_at / verified_by, preserving interval_days.
 * If there's no row yet (a doc that's never been verified), inserts one
 * with the default interval. Requires the 'review' role (reviewer/admin).
 */
export async function reverifyDocumentAction(
  documentId: string,
): Promise<ReverifyResult> {
  const { supabase, profileId, role } = await requireProfile();
  requirePermission(role, "review");

  const nowIso = new Date().toISOString();

  // Look up current interval so the update preserves whatever cadence the
  // doc was on. Two-step rather than UPSERT because UPSERT would clobber
  // interval_days back to whatever value we pass.
  const { data: existing, error: readErr } = await supabase
    .from("verifications")
    .select("interval_days")
    .eq("document_id", documentId)
    .maybeSingle();
  if (readErr) throw readErr;

  let intervalDays: number;
  if (existing) {
    intervalDays = (existing as { interval_days: number }).interval_days;
    const { error: updErr } = await supabase
      .from("verifications")
      .update({
        last_verified_at: nowIso,
        verified_by: profileId,
      })
      .eq("document_id", documentId);
    if (updErr) throw updErr;
  } else {
    intervalDays = DEFAULT_INTERVAL_DAYS;
    const { error: insErr } = await supabase.from("verifications").insert({
      document_id: documentId,
      last_verified_at: nowIso,
      interval_days: intervalDays,
      verified_by: profileId,
    });
    if (insErr) throw insErr;
  }

  // Resolve the verifier's display name so the client can show it without
  // an extra round-trip.
  const { data: prof } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", profileId)
    .maybeSingle();

  revalidatePath("/");

  return {
    documentId,
    lastVerifiedAt: nowIso,
    intervalDays,
    by: (prof as { name?: string } | null)?.name ?? "—",
  };
}
