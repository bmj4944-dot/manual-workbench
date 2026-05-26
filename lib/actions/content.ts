"use server";

import { revalidatePath } from "next/cache";
import {
  actionFail as fail,
  requirePermission,
  requireProfile,
} from "./_helpers";

export type AddTagResult =
  | { ok: true; tags: string[] | null }
  | { ok: false; reason: string };

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

const MAX_TAG_LEN = 24;
const MAX_TAGS = 12;

function normalizeTag(raw: string): string {
  // Collapse internal whitespace, strip commas (we use them as separators on
  // the client), trim, cap length.
  return raw.replace(/[,\s]+/g, " ").trim().slice(0, MAX_TAG_LEN);
}

async function readCurrentTags(documentId: string): Promise<{
  supabase: Awaited<ReturnType<typeof requireProfile>>["supabase"];
  profileId: string;
  current: string[];
}> {
  const { supabase, profileId, role } = await requireProfile();
  requirePermission(role, "edit");
  const { data, error } = await supabase
    .from("document_content")
    .select("tags")
    .eq("document_id", documentId)
    .maybeSingle();
  if (error) throw error;
  const current = (data as { tags: string[] | null } | null)?.tags ?? [];
  return { supabase, profileId, current };
}

/**
 * Appends a tag to document_content.tags. Idempotent (no-op if already present
 * after case-insensitive compare) and writes back the normalized form. UPSERTs
 * so docs without a content row yet still get one. Requires 'edit'.
 */
export async function addTagAction(
  documentId: string,
  raw: string,
): Promise<AddTagResult> {
  const tag = normalizeTag(raw);
  if (!tag) return { ok: true, tags: null };

  const { supabase, profileId, current } = await readCurrentTags(documentId);
  if (current.some((t) => t.toLowerCase() === tag.toLowerCase())) {
    return { ok: true, tags: current };
  }
  if (current.length >= MAX_TAGS) {
    return fail(`태그는 최대 ${MAX_TAGS}개까지 추가할 수 있습니다.`);
  }
  const next = [...current, tag];

  const { error } = await supabase
    .from("document_content")
    .upsert(
      { document_id: documentId, tags: next, author_id: profileId },
      { onConflict: "document_id" },
    );
  if (error) throw error;
  revalidatePath("/");
  return { ok: true, tags: next };
}

/**
 * Removes a tag from document_content.tags (case-insensitive match). No-op if
 * the tag is not present. Requires 'edit'.
 */
export async function removeTagAction(documentId: string, tag: string) {
  const target = tag.trim();
  if (!target) return { tags: null as string[] | null };

  const { supabase, current } = await readCurrentTags(documentId);
  const next = current.filter((t) => t.toLowerCase() !== target.toLowerCase());
  if (next.length === current.length) return { tags: current };

  const { error } = await supabase
    .from("document_content")
    .update({ tags: next })
    .eq("document_id", documentId);
  if (error) throw error;
  revalidatePath("/");
  return { tags: next };
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
