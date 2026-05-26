import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

const ROLE_PERMS: Record<Role, ReadonlySet<string>> = {
  admin:    new Set(["edit", "review", "approve", "publish"]),
  reviewer: new Set(["review", "approve"]),
  editor:   new Set(["edit"]),
  viewer:   new Set(),
};

/**
 * Resolves the current authenticated user → profile id + role mapping.
 * Throws if the user is not signed in. Used by Server Actions to enforce
 * "as oneself" writes and role-gated operations without trusting the client.
 */
export async function requireProfile() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not authenticated");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (!profile) throw new Error("profile not found for current user");

  const row = profile as { id: string; role: Role };
  return {
    supabase,
    user,
    profileId: row.id,
    role: row.role,
  };
}

export function requirePermission(role: Role, action: string) {
  if (!ROLE_PERMS[role].has(action)) {
    throw new Error(`role '${role}' lacks permission '${action}'`);
  }
}

/**
 * admin 전용 server action 가드. requireProfile 로 받은 role 을 검사한다.
 * 일반 권한 게이트(`requirePermission`) 와 분리해 둔 이유:
 *   - 'edit'/'review'/'approve'/'publish' 는 콘텐츠 권한 매트릭스
 *   - admin 전용은 "사람·시스템 관리" 의 메타 권한 — 매트릭스에 묶이지 않음
 */
export function requireAdmin(role: Role) {
  if (role !== "admin") {
    throw new Error("관리자 권한이 필요합니다.");
  }
}
