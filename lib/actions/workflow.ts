"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, requireProfile } from "./_helpers";
import type { NodeStatus } from "@/lib/types";

const STATUS_TO_PERMISSION: Record<NodeStatus, string> = {
  draft:     "edit",
  review:    "edit",
  approved:  "approve",
  published: "publish",
};

const STATUS_LABEL_KO: Record<NodeStatus, string> = {
  draft:     "초안",
  review:    "검토중",
  approved:  "승인",
  published: "공개",
};

/**
 * Updates document.status. Snapshots the current body as a version row so the
 * workflow transition is reflected in history (with 'approved'/'published'
 * tags where applicable).
 */
export async function setNodeStatusAction(
  documentId: string,
  status: NodeStatus,
) {
  const { supabase, profileId, role } = await requireProfile();
  requirePermission(role, STATUS_TO_PERMISSION[status]);

  // Snapshot current body for the version row.
  const { data: contentRow } = await supabase
    .from("document_content")
    .select("body, version")
    .eq("document_id", documentId)
    .maybeSingle();
  const currentBody = (contentRow as { body?: string } | null)?.body ?? "";

  // Update status.
  const { error: updErr } = await supabase
    .from("documents")
    .update({ status })
    .eq("id", documentId);
  if (updErr) throw updErr;

  // Append a version row only for transitions worth recording (review onward).
  if (status !== "draft") {
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

    const { error: versErr } = await supabase
      .from("document_versions")
      .insert({
        document_id: documentId,
        version_label: nextLabel,
        author_id: profileId,
        description: `상태 변경 → ${STATUS_LABEL_KO[status]}`,
        body: currentBody,
        tag: status === "approved" || status === "published" ? status : null,
      });
    if (versErr) throw versErr;
  }

  revalidatePath("/");
}
