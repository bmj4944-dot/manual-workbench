"use server";

import { revalidatePath } from "next/cache";
import {
  actionFail as fail,
  type ActionResult,
  requirePermission,
  requireProfile,
} from "./_helpers";
import { logAction } from "./_audit";
import { notify } from "./_notify";
import {
  REVIEW_SLA_DAYS,
  type DocSensitivity,
  type DocVisibility,
  type NodeStatus,
} from "@/lib/types";

const SENSITIVITY_VALUES: DocSensitivity[] = [
  "general",
  "confidential",
  "restricted",
];

const VISIBILITY_VALUES: DocVisibility[] = ["all", "team", "private"];

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
    .select("status, label, created_by")
    .eq("id", documentId)
    .maybeSingle();
  const curRow = cur as
    | { status?: NodeStatus | null; label?: string | null; created_by?: string | null }
    | null;
  const currentStatus = curRow?.status;
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

  await logAction({
    actorId: profileId,
    action: "workflow.reject",
    targetType: "document",
    targetId: documentId,
    metadata: { reason: trimmed },
  });

  // 작성자에게 거부 알림 (본인이 본인 문서를 거부하면 notify 가 skip)
  await notify({
    recipientId: curRow?.created_by ?? null,
    actorId: profileId,
    type: "workflow.reject",
    title: `'${curRow?.label ?? "문서"}' 검토가 거부되었습니다`,
    body: trimmed,
    docId: documentId,
  });

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
): Promise<ActionResult> {
  const { supabase, profileId, role } = await requireProfile();
  requirePermission(role, STATUS_TO_PERMISSION[status]);

  // 작성자 알림 + 승인자 게이트용 메타.
  const { data: docRow } = await supabase
    .from("documents")
    .select("label, created_by, required_approver_id")
    .eq("id", documentId)
    .maybeSingle();
  const docMeta = docRow as
    | {
        label?: string | null;
        created_by?: string | null;
        required_approver_id?: string | null;
      }
    | null;

  // 승인자 게이트: review → approved 는 지정 승인자만(있을 때). NULL 이면
  // approve 권한자 누구나 (위 requirePermission 으로 이미 통과).
  if (
    status === "approved" &&
    docMeta?.required_approver_id &&
    docMeta.required_approver_id !== profileId
  ) {
    return fail("이 문서는 지정된 승인자만 승인할 수 있습니다.");
  }

  // Snapshot current body for the version row.
  const { data: contentRow } = await supabase
    .from("document_content")
    .select("body, version")
    .eq("document_id", documentId)
    .maybeSingle();
  const currentBody = (contentRow as { body?: string } | null)?.body ?? "";

  // Update status. review 진입 시 SLA 기한 설정 + overdue 플래그 리셋,
  // review 를 벗어나면 기한/플래그를 비운다(재검토는 새 SLA 로 시작).
  const statusPatch: Record<string, unknown> = { status };
  if (status === "review") {
    statusPatch.review_deadline = new Date(
      Date.now() + REVIEW_SLA_DAYS * 86_400_000,
    ).toISOString();
    statusPatch.overdue_notified = false;
  } else {
    statusPatch.review_deadline = null;
    statusPatch.overdue_notified = false;
  }
  const { error: updErr } = await supabase
    .from("documents")
    .update(statusPatch)
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

  await logAction({
    actorId: profileId,
    action: "workflow.transition",
    targetType: "document",
    targetId: documentId,
    metadata: { status },
  });

  // 승인/공개 시 작성자에게 알림 (본인 전이면 notify 가 skip)
  if (status === "approved" || status === "published") {
    await notify({
      recipientId: docMeta?.created_by ?? null,
      actorId: profileId,
      type: `workflow.${status}`,
      title: `'${docMeta?.label ?? "문서"}'${
        status === "approved" ? " 가 승인되었습니다" : " 가 공개되었습니다"
      }`,
      docId: documentId,
    });
  }

  // review 진입 시 지정 승인자에게 검토 요청 알림 (지정돼 있을 때만)
  if (status === "review" && docMeta?.required_approver_id) {
    await notify({
      recipientId: docMeta.required_approver_id,
      actorId: profileId,
      type: "workflow.review_request",
      title: `'${docMeta?.label ?? "문서"}' 검토·승인 요청`,
      docId: documentId,
    });
  }

  revalidatePath("/");
  return { ok: true };
}

/**
 * 문서의 지정 승인자(required_approver_id)를 설정/해제한다. approve 권한자
 * (admin/reviewer)만 지정 가능. 승인자 후보 역시 approve 가능 역할이어야
 * 실제로 승인할 수 있으므로 역할을 검증한다. null 을 주면 해제(누구나 승인).
 */
export async function setRequiredApproverAction(
  documentId: string,
  approverId: string | null,
): Promise<ActionResult> {
  const { supabase, profileId, role } = await requireProfile();
  requirePermission(role, "approve");

  if (approverId) {
    const { data: cand } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", approverId)
      .maybeSingle();
    const candRow = cand as
      | { role?: string | null; is_active?: boolean | null }
      | null;
    if (!candRow) return fail("승인자 후보를 찾을 수 없습니다.");
    if (candRow.is_active === false) {
      return fail("비활성 계정은 승인자로 지정할 수 없습니다.");
    }
    if (candRow.role !== "admin" && candRow.role !== "reviewer") {
      return fail("승인 권한이 있는 사용자(관리자·검토자)만 지정할 수 있습니다.");
    }
  }

  const { error: updErr } = await supabase
    .from("documents")
    .update({ required_approver_id: approverId })
    .eq("id", documentId);
  if (updErr) throw updErr;

  await logAction({
    actorId: profileId,
    action: "workflow.set_approver",
    targetType: "document",
    targetId: documentId,
    metadata: { approverId },
  });

  revalidatePath("/");
  return { ok: true };
}

/**
 * 문서 민감도(general/confidential/restricted)를 설정한다. 그룹 6.
 * approve 권한자(admin/reviewer)만 분류 가능. 민감도는 can_view_document 의
 * 게이트로 작동해 열람 가능 역할을 제한한다.
 */
export async function setDocumentSensitivityAction(
  documentId: string,
  level: DocSensitivity,
): Promise<ActionResult> {
  const { supabase, profileId, role } = await requireProfile();
  requirePermission(role, "approve");

  if (!SENSITIVITY_VALUES.includes(level)) {
    return fail("알 수 없는 민감도 레벨입니다.");
  }

  const { error: updErr } = await supabase
    .from("documents")
    .update({ sensitivity: level })
    .eq("id", documentId);
  if (updErr) throw updErr;

  await logAction({
    actorId: profileId,
    action: "document.set_sensitivity",
    targetType: "document",
    targetId: documentId,
    metadata: { level },
  });

  revalidatePath("/");
  return { ok: true };
}

/**
 * 문서 가시성(all/team/private)을 설정한다. A. 권한·조직 정교화.
 * approve 권한자(admin/reviewer)만 설정 가능. 가시성은 can_view_document 게이트로
 * 작동해 열람 가능 범위를 좁힌다(편집 권한은 기존 역할 매트릭스 유지).
 *   - team:    owner_team_id 필수 → 소유 팀 멤버 + admin/reviewer 만 열람
 *   - private: 작성자 + admin/reviewer 만 열람
 *   - all:     전원(현행). team/private 이 아니면 owner_team_id 는 null 로 정리.
 */
export async function setDocumentVisibilityAction(
  documentId: string,
  visibility: DocVisibility,
  ownerTeamId?: string | null,
): Promise<ActionResult> {
  const { supabase, profileId, role } = await requireProfile();
  requirePermission(role, "approve");

  if (!VISIBILITY_VALUES.includes(visibility)) {
    return fail("알 수 없는 가시성 값입니다.");
  }

  const team = visibility === "team" ? ownerTeamId ?? null : null;
  if (visibility === "team" && !team) {
    return fail("팀 공개는 소유 팀을 지정해야 합니다.");
  }

  const { error: updErr } = await supabase
    .from("documents")
    .update({ visibility, owner_team_id: team })
    .eq("id", documentId);
  if (updErr) throw updErr;

  await logAction({
    actorId: profileId,
    action: "document.set_visibility",
    targetType: "document",
    targetId: documentId,
    metadata: { visibility, ownerTeamId: team },
  });

  revalidatePath("/");
  return { ok: true };
}
