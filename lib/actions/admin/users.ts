"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin, requireProfile } from "../_helpers";
import type { Role } from "@/lib/types";

const ROLE_VALUES: Role[] = ["admin", "reviewer", "editor", "viewer"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * 다른 멤버의 역할을 변경한다. admin 전용. 다음 가드 적용:
 *   1) 자기 자신을 admin 외 역할로 강등 금지 (락아웃 방지)
 *   2) 마지막 admin 강등 금지 (시스템에 admin 1명은 항상 남기)
 */
export async function setUserRoleAction(
  targetProfileId: string,
  newRole: Role,
) {
  const { supabase, profileId: selfId, role: selfRole } = await requireProfile();
  requireAdmin(selfRole);

  if (!ROLE_VALUES.includes(newRole)) {
    throw new Error(`알 수 없는 역할입니다: ${newRole}`);
  }

  // 자기 자신 강등 차단
  if (targetProfileId === selfId && newRole !== "admin") {
    throw new Error("본인을 관리자에서 강등할 수 없습니다.");
  }

  // 마지막 admin 보호: 대상이 admin이고 newRole != admin 이면 admin 수 확인
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
        throw new Error("마지막 관리자는 강등할 수 없습니다.");
      }
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role: newRole })
    .eq("id", targetProfileId);
  if (error) throw error;

  revalidatePath("/admin/users");
}

/**
 * 새 사용자를 Magic Link 로 초대한다. admin 전용.
 *   - Supabase admin SDK 의 inviteUserByEmail 사용 (SMTP 설정 필요 — 매뉴얼에선
 *     이미 Magic Link 가 동작하므로 같은 SMTP 가 쓰임)
 *   - 트리거가 profile 을 자동 생성한 후, initialRole 이 지정되면 즉시 UPDATE
 */
export async function inviteUserAction(
  email: string,
  initialRole?: Role,
) {
  const { role: selfRole } = await requireProfile();
  requireAdmin(selfRole);

  const cleaned = email.trim().toLowerCase();
  if (!EMAIL_RE.test(cleaned)) {
    throw new Error("올바른 이메일 형식이 아닙니다.");
  }
  if (initialRole && !ROLE_VALUES.includes(initialRole)) {
    throw new Error(`알 수 없는 역할입니다: ${initialRole}`);
  }

  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.inviteUserByEmail(cleaned);
  if (error) {
    if (/already.*registered|exists/i.test(error.message)) {
      throw new Error("이미 가입된 이메일입니다.");
    }
    throw error;
  }
  const authUserId = data?.user?.id;
  if (!authUserId) {
    throw new Error("초대 응답에서 사용자 ID 를 받지 못했습니다.");
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
}
