"use server";

import { actionFail as fail, type ActionResult, requireProfile } from "./_helpers";

/**
 * 알림 한 건 읽음 처리. 수신자 본인만(RLS notifications_update_own). 작성은
 * service_role 이지만 읽음 처리는 사용자 본인의 행이라 일반 클라이언트로 충분.
 * 친절 실패 메시지를 위해 ActionResult 반환 ([[feedback-action-result-pattern]]).
 */
export async function markNotificationReadAction(
  notificationId: string,
): Promise<ActionResult> {
  const { supabase } = await requireProfile();

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .is("read_at", null);
  if (error) return fail("알림을 읽음 처리하지 못했습니다.");

  return { ok: true };
}

/**
 * 본인의 미읽음 알림 전체를 읽음 처리. RLS 가 본인 행으로 범위를 좁히므로
 * read_at is null 조건만으로 안전하다.
 */
export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  const { supabase } = await requireProfile();

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  if (error) return fail("알림을 모두 읽음 처리하지 못했습니다.");

  return { ok: true };
}
