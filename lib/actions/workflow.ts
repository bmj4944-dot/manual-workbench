"use server";

import { revalidatePath } from "next/cache";
import {
  actionFail as fail,
  type ActionResult,
  requirePermission,
  requireProfile,
} from "./_helpers";
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
 * 검토 단계 거부: review → draft 로 되돌리면서 거부 사유를 댓글로 자동 추가.
 * reviewer 이상만 호출 가능 (review 권한). 거부는 명시 사유가 있어야 의미가 있어서
 * 빈 문자열은 막는다.
 */
export async function rejectDocumentAction(
  documentId: string,
  reason: string,
): Promise<ActionResult> {
  const { supabase, profileId, role } = await requireProfile();
  requirePermission(role, "review");

  const trimmed = reason.trim();
  if (!trimmed) return fail("거부 사유를 입력하세요.");
  if (trimmed.length > 500) return fail("거부 사유는 500자 이내여야 합니다.");

  const { data: cur } = await supabase
    .from("documents")
    .select("status")
    .eq("id", documentId)
    .maybeSingle();
  const currentStatus = (cur as { status?: NodeStatus | null } | null)?.status;
  if (currentStatus !== "review") {
    return fail("검토중인 문서만 거부할 수 있습니다.");
  }

  const { error: updErr } = await supabase
    .from("documents")
    .update({ status: "draft" })
    .eq("id", documentId);
  if (updErr) throw updErr;

  const { error: cmtErr } = await supabase.from("comments").insert({
    document_id: documentId,
    author_id: profileId,
    body: `[거부] ${trimmed}`,
    resolved: false,
  });
  if (cmtErr) throw cmtErr;

  revalidatePath("/");
  return { ok: true };
}

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
