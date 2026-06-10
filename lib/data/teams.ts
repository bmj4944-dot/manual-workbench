import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import type { Role, Team } from "@/lib/types";

type TeamRow = { id: string; name: string };

/**
 * 팀 목록 + 멤버 수 (워크벤치 드롭다운용). 인증 사용자가 RLS 로 읽을 수 있다
 * (teams_read / team_members_read 정책). 멤버 수는 team_members 를 한 번에
 * 집계해 N+1 회피.
 */
export async function fetchTeams(): Promise<Team[]> {
  const supabase = createClient();

  const [teamsRes, membersRes] = await Promise.all([
    supabase.from("teams").select("id, name").order("name"),
    supabase.from("team_members").select("team_id"),
  ]);

  if (teamsRes.error) throw teamsRes.error;

  const count = new Map<string, number>();
  for (const m of (membersRes.data ?? []) as Array<{ team_id: string }>) {
    count.set(m.team_id, (count.get(m.team_id) ?? 0) + 1);
  }

  return ((teamsRes.data ?? []) as TeamRow[]).map((t) => ({
    id: t.id,
    name: t.name,
    memberCount: count.get(t.id) ?? 0,
  }));
}

export type TeamWithMembers = {
  id: string;
  name: string;
  members: Array<{
    profileId: string;
    name: string;
    initials: string;
    color: string;
    role: Role;
  }>;
};

type MemberJoinRow = {
  team_id: string;
  profile_id: string;
  profiles: {
    name: string;
    initials: string;
    color: string;
    role: Role;
  } | null;
};

/**
 * 팀별 멤버 profile 목록까지 펼쳐서 (admin 콘솔 전용). service-role admin client
 * 로 일관 처리한다.
 */
export async function fetchTeamsWithMembers(): Promise<TeamWithMembers[]> {
  const admin = createAdminClient();

  const teamsRes = await admin.from("teams").select("id, name").order("name");
  if (teamsRes.error) throw teamsRes.error;

  const membersRes = await admin
    .from("team_members")
    .select("team_id, profile_id, profiles(name, initials, color, role)");
  if (membersRes.error) throw membersRes.error;

  const byTeam = new Map<string, TeamWithMembers["members"]>();
  for (const row of (membersRes.data ?? []) as unknown as MemberJoinRow[]) {
    if (!row.profiles) continue;
    const list = byTeam.get(row.team_id) ?? [];
    list.push({
      profileId: row.profile_id,
      name: row.profiles.name,
      initials: row.profiles.initials,
      color: row.profiles.color,
      role: row.profiles.role,
    });
    byTeam.set(row.team_id, list);
  }

  return ((teamsRes.data ?? []) as TeamRow[]).map((t) => ({
    id: t.id,
    name: t.name,
    members: (byTeam.get(t.id) ?? []).sort((a, b) =>
      a.name.localeCompare(b.name, "ko"),
    ),
  }));
}
