import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

export type AdminUserRow = {
  profileId: string;
  authUserId: string | null;
  name: string;
  initials: string;
  color: string;
  role: Role;
  email: string | null;
  createdAt: string;
  lastSignInAt: string | null;
};

type ProfileRow = {
  id: string;
  auth_user_id: string | null;
  name: string;
  initials: string;
  color: string;
  role: Role;
  created_at: string;
};

type AuthUserRow = {
  id: string;
  email: string | null;
  last_sign_in_at: string | null;
};

/**
 * 모든 멤버 목록을 한 번에 가져온다 (admin 콘솔 전용). RLS 우회 + auth.users
 * 접근이 필요해 service-role admin client 를 쓴다. 절대 client 로 노출 금지.
 */
export async function fetchAllUsers(): Promise<AdminUserRow[]> {
  const admin = createAdminClient();

  const profilesRes = await admin
    .from("profiles")
    .select("id, auth_user_id, name, initials, color, role, created_at")
    .order("created_at", { ascending: true });
  if (profilesRes.error) throw profilesRes.error;
  const profiles = (profilesRes.data ?? []) as unknown as ProfileRow[];

  // auth.admin.listUsers 로 이메일/마지막 로그인 가져오기
  // (Supabase 는 한 페이지 최대 1000명, 첫 페이지로 충분)
  const authRes = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (authRes.error) throw authRes.error;
  const authById = new Map<string, AuthUserRow>();
  for (const u of authRes.data.users) {
    authById.set(u.id, {
      id: u.id,
      email: u.email ?? null,
      last_sign_in_at: u.last_sign_in_at ?? null,
    });
  }

  return profiles.map<AdminUserRow>((p) => {
    const auth = p.auth_user_id ? authById.get(p.auth_user_id) : undefined;
    return {
      profileId: p.id,
      authUserId: p.auth_user_id,
      name: p.name,
      initials: p.initials,
      color: p.color,
      role: p.role,
      email: auth?.email ?? null,
      createdAt: p.created_at,
      lastSignInAt: auth?.last_sign_in_at ?? null,
    };
  });
}
