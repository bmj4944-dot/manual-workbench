import "server-only";
import { createAdminClient } from "@/lib/supabase/server";

export type AuditEvent = {
  actorId: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
  ok?: boolean;
};

/**
 * audit_logs 에 한 줄 기록. fire-and-forget — 실패해도 호출자 동작에 영향
 * 없게 try/catch + console.error 만. INSERT 권한이 service_role 에만 있어서
 * admin client 로 작성.
 *
 * 사용 패턴:
 *   const { profileId } = await requireProfile();
 *   await logAction({ actorId: profileId, action: "document.create",
 *                     targetType: "document", targetId: id });
 *
 * 실패 케이스는 ok: false 로 기록 (검증 실패 / 권한 거부 등). 그러면 누가
 * 무엇을 시도했는지 추적 가능.
 */
export async function logAction(event: AuditEvent): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("audit_logs").insert({
      actor_id: event.actorId,
      action: event.action,
      target_type: event.targetType ?? null,
      target_id: event.targetId ?? null,
      metadata: event.metadata ?? {},
      ok: event.ok ?? true,
    });
  } catch (err) {
    console.error("[audit] logAction failed", { action: event.action, err });
  }
}
