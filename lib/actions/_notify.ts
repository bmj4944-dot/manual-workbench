import "server-only";
import { createAdminClient } from "@/lib/supabase/server";

export type NotifyEvent = {
  recipientId: string | null;
  type: string;
  title: string;
  body?: string | null;
  docId?: string | null;
  actorId?: string | null;
};

/**
 * notifications 에 한 줄 작성. _audit.ts 의 logAction 과 같은 fire-and-forget
 * 패턴 — 실패해도 호출자(워크플로 전이 등) 동작을 막지 않는다. INSERT 권한이
 * service_role 에만 있어서 admin client 로 작성.
 *
 * 가드:
 *   - recipientId 없음(시드 문서처럼 created_by 가 NULL) → 조용히 skip
 *   - recipient === actor → 본인이 본인에게 보내는 알림은 의미 없어 skip
 *
 * 사용 패턴:
 *   await notify({ recipientId: authorId, actorId: profileId,
 *                  type: "workflow.reject", title: "문서가 거부되었습니다",
 *                  body: reason, docId });
 */
export async function notify(event: NotifyEvent): Promise<void> {
  if (!event.recipientId) return;
  if (event.actorId && event.recipientId === event.actorId) return;
  try {
    const admin = createAdminClient();
    await admin.from("notifications").insert({
      recipient_id: event.recipientId,
      type: event.type,
      title: event.title,
      body: event.body ?? null,
      doc_id: event.docId ?? null,
      actor_id: event.actorId ?? null,
    });
  } catch (err) {
    console.error("[notify] failed", { type: event.type, err });
  }
}
