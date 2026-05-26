import { fetchAllUsers } from "@/lib/data/users";
import { createClient } from "@/lib/supabase/server";
import { UsersClient } from "./users-client";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const users = await fetchAllUsers();

  // 본인 profileId 식별 — 자기 자신을 강등하는 UI 차단에 사용
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let selfProfileId: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    selfProfileId = (profile as { id?: string } | null)?.id ?? null;
  }

  return <UsersClient users={users} selfProfileId={selfProfileId} />;
}
