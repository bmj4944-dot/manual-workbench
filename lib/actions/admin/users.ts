"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin, requireProfile } from "../_helpers";
import type { Role } from "@/lib/types";

const ROLE_VALUES: Role[] = ["admin", "reviewer", "editor", "viewer"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Next.js 14 production 빌드에서는 server action 이 throw 하면 친절한 메시지가
 * 클라이언트로 전달되지 않고 generic "Server Components render" 에러로 바뀐다.
 * 사용자 검증 같은 예측 가능한 실패는 result 객체로 반환해 toast 에서
 * 그대로 보여줄 수 있게 한다. 진짜 예외(DB 장애 등) 만 throw.
 */
export type ActionResult = { ok: true } | { ok: false; reason: string };

function fail(reason: string): ActionResult {
  return { ok: false, reason };
}

/**
 * 다른 멤버의 역할을 변경한다. admin 전용. 가드:
 *   1) 자기 자신을 admin 외 역할로 강등 금지 (락아웃 방지)
 *   2) 마지막 admin 강등 금지 (시스템에 admin 1명은 항상 남기)
 */
export async function setUserRoleAction(
  targetProfileId: string,
  newRole: Role,
): Promise<ActionResult> {
  const { supabase, profileId: selfId, role: selfRole } = await requireProfile();
  requireAdmin(selfRole);

  if (!ROLE_VALUES.includes(newRole)) {
    return fail(`알 수 없는 역할입니다: ${newRole}`);
  }

  // 자기 자신 강등 차단
  if (targetProfileId === selfId && newRole !== "admin") {
    return fail("본인을 관리자에서 강등할 수 없습니다.");
  }

  // 마지막 admin 보호
  if (newRole !== "admin") {
    const { data: target, error: tErr } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", targetProfileId)
      .maybeSingle();
    if (tErr) throw tErr;
    const targetRole = (target as { role?: Role } | null)?.role;
    if (targetRole === "admin") {
      const { count, error: cErr } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin");
      if (cErr) throw cErr;
      if ((count ?? 0) <= 1) {
        return fail("마지막 관리자는 강등할 수 없습니다.");
      }
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role: newRole })
    .eq("id", targetProfileId);
  if (error) throw error;

  revalidatePath("/admin/users");
  return { ok: true };
}

/**
 * 새 사용자를 Magic Link 로 초대한다. admin 전용.
 */
export async function inviteUserAction(
  email: string,
  initialRole?: Role,
): Promise<ActionResult> {
  const { role: selfRole } = await requireProfile();
  requireAdmin(selfRole);

  const cleaned = email.trim().toLowerCase();
  if (!EMAIL_RE.test(cleaned)) {
    return fail("올바른 이메일 형식이 아닙니다.");
  }
  if (initialRole && !ROLE_VALUES.includes(initialRole)) {
    return fail(`알 수 없는 역할입니다: ${initialRole}`);
  }

  const admin = createAdminClient();

  // Supabase invite 시 redirect URL 을 명시. SITE_URL 환경변수가 없으면
  // NEXT_PUBLIC_SITE_URL 또는 Vercel 자동 주입 도메인 fallback.
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);
  const redirectTo = siteUrl ? `${siteUrl}/auth/callback` : undefined;

  const { data, error } = await admin.auth.admin.inviteUserByEmail(
    cleaned,
    redirectTo ? { redirectTo } : undefined,
  );
  if (error) {
    console.error("[inviteUserAction] inviteUserByEmail failed:", {
      email: cleaned,
      redirectTo,
      status: (error as { status?: number }).status,
      code: (error as { code?: string }).code,
      message: error.message,
    });
    if (/already.*registered|exists/i.test(error.message)) {
      return fail("이미 가입된 이메일입니다.");
    }
    if (/rate.*limit|429/i.test(error.message)) {
      return fail("이메일 발송 한도(시간당 3건)를 초과했습니다. 잠시 후 다시 시도해주세요.");
    }
    if (/redirect/i.test(error.message)) {
      return fail(
        "초대 메일 redirect URL 이 Supabase 에 등록되지 않았습니다. " +
        "Supabase Dashboard > Authentication > URL Configuration 을 확인해주세요.",
      );
    }
    return fail(`초대 실패: ${error.message}`);
  }
  const authUserId = data?.user?.id;
  if (!authUserId) {
    return fail("초대 응답에서 사용자 ID 를 받지 못했습니다.");
  }

  // handle_new_user 트리거가 profiles 행을 만든다. 즉시 역할 덮어쓰기는
  // 트리거 완료를 기다리는 대신 short-poll 로 처리.
  if (initialRole && initialRole !== "editor") {
    for (let i = 0; i < 5; i++) {
      const { data: prof, error: pErr } = await admin
        .from("profiles")
        .select("id")
        .eq("auth_user_id", authUserId)
        .maybeSingle();
      if (pErr) throw pErr;
      const profileId = (prof as { id?: string } | null)?.id;
      if (profileId) {
        const { error: upErr } = await admin
          .from("profiles")
          .update({ role: initialRole })
          .eq("id", profileId);
        if (upErr) throw upErr;
        break;
      }
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  revalidatePath("/admin/users");
  return { ok: true };
}
