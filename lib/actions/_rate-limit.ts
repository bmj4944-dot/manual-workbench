import "server-only";
import { actionFail } from "./_helpers";
import { logAction } from "./_audit";

/**
 * Server action rate limiting — 그룹 5-B.
 *
 * 슬라이딩 윈도, 키(`profileId:action`)별 호출 타임스탬프 배열로 판정.
 * ⚠️ 인메모리라 serverless 인스턴스마다 독립적이다(완벽한 글로벌 제한 아님).
 * 단일 인스턴스 폭주/오작동을 막는 1차 방어선이며, 분산·영구 제한이 필요하면
 * Supabase 테이블이나 Upstash 같은 외부 스토어로 교체한다. ai.ts 의 AI 전용
 * 제한도 이 헬퍼를 공유한다.
 */
const buckets = new Map<string, number[]>();

/** 호출이 한도 내면 true(허용), 초과면 false. 허용 시 타임스탬프를 적재. */
export function allowRate(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= max) {
    buckets.set(key, hits); // 윈도 밖 항목은 정리해두되 새 호출은 적재 안 함
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  return true;
}

const MSG = "요청이 너무 잦습니다. 잠시 후 다시 시도해주세요.";

/**
 * ActionResult 를 반환하는 액션용. 한도 초과면 audit 기록 후 fail 객체를,
 * 통과면 null 을 돌려준다. 사용:
 *   const limited = await rateLimitFail(profileId, "user.invite", 10, 60_000);
 *   if (limited) return limited;
 */
export async function rateLimitFail(
  profileId: string,
  action: string,
  max: number,
  windowMs: number,
): Promise<{ ok: false; reason: string } | null> {
  if (allowRate(`${profileId}:${action}`, max, windowMs)) return null;
  await logAction({
    actorId: profileId,
    action,
    ok: false,
    metadata: { reason: "rate_limited" },
  });
  return actionFail(MSG);
}

/**
 * void/커스텀 반환 액션용. 한도 초과면 audit 기록 후 throw. 사용:
 *   await rateLimitThrow(profileId, "comment.add", 30, 60_000);
 */
export async function rateLimitThrow(
  profileId: string,
  action: string,
  max: number,
  windowMs: number,
): Promise<void> {
  if (allowRate(`${profileId}:${action}`, max, windowMs)) return;
  await logAction({
    actorId: profileId,
    action,
    ok: false,
    metadata: { reason: "rate_limited" },
  });
  throw new Error(MSG);
}
