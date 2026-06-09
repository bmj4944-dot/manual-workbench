import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { notify } from "./_notify";

type OverdueRow = { id: string; label: string | null };

/**
 * 검토 기한 초과 알림을 cron 없이 멱등하게 처리한다. 워크벤치 로드 시 한 번
 * 호출(workbench-shell). "내가 지정 승인자이고, status=review, 기한이 지났으며,
 * 아직 알림을 안 보낸" 문서에 1회 알림을 만들고 overdue_notified=true 로 표시
 * → 같은 문서가 다음 로드에서 다시 알리지 않는다.
 *
 * actorId 는 null(시스템 발신) — recipient 가 곧 승인자 본인이라 _notify 의
 * self-notify 가드(recipient===actor)에 걸리지 않도록.
 *
 * admin client 사용: 여러 사용자 문서를 가로질러 읽고 overdue_notified 를
 * 갱신하며 notifications 에 insert(service_role) 해야 하기 때문.
 */
export async function sweepOverdueReviews(approverProfileId: string): Promise<void> {
  if (!approverProfileId) return;
  try {
    const admin = createAdminClient();
    const nowIso = new Date().toISOString();

    const { data, error } = await admin
      .from("documents")
      .select("id, label")
      .eq("status", "review")
      .eq("required_approver_id", approverProfileId)
      .eq("overdue_notified", false)
      .lt("review_deadline", nowIso);
    if (error) throw error;

    const overdue = (data ?? []) as unknown as OverdueRow[];
    for (const doc of overdue) {
      await notify({
        recipientId: approverProfileId,
        actorId: null,
        type: "workflow.overdue",
        title: `'${doc.label ?? "문서"}' 검토 기한이 지났습니다`,
        docId: doc.id,
      });
      await admin
        .from("documents")
        .update({ overdue_notified: true })
        .eq("id", doc.id);
    }
  } catch (err) {
    console.error("[sla] sweepOverdueReviews failed", err);
  }
}
