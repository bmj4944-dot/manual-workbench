"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import {
  actionFail as fail,
  type ActionResult,
  requireAdmin,
  requireProfile,
} from "./_helpers";
import { logAction } from "./_audit";

const MAX_TEAM_NAME = 60;

/**
 * 팀/부서 관리 server action 모음 (A. 권한·조직 정교화). 전부 admin 전용.
 * RLS 가 teams/team_members 쓰기를 막아두었으므로 service_role(admin client)
 * 로 직접 수행한다 (admin/users.ts 와 동일 패턴). 검증 실패는 ActionResult
 * 로 반환, DB 장애만 throw. 모든 변경은 audit_logs 에 기록.
 */

function normalizeName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export async function createTeamAction(name: string): Promise<ActionResult> {
  const { profileId, role } = await requireProfile();
  requireAdmin(role);

  const clean = normalizeName(name);
  if (!clean) return fail("팀 이름을 입력하세요.");
  if (clean.length > MAX_TEAM_NAME) {
    return fail(`팀 이름은 ${MAX_TEAM_NAME}자 이하여야 합니다.`);
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("teams")
    .insert({ name: clean, created_by: profileId });
  if (error) throw error;

  await logAction({
    actorId: profileId,
    action: "team.create",
    targetType: "team",
    metadata: { name: clean },
  });

  revalidatePath("/admin/teams");
  revalidatePath("/");
  return { ok: true };
}

export async function renameTeamAction(
  teamId: string,
  name: string,
): Promise<ActionResult> {
  const { profileId, role } = await requireProfile();
  requireAdmin(role);

  const clean = normalizeName(name);
  if (!clean) return fail("팀 이름을 입력하세요.");
  if (clean.length > MAX_TEAM_NAME) {
    return fail(`팀 이름은 ${MAX_TEAM_NAME}자 이하여야 합니다.`);
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("teams")
    .update({ name: clean })
    .eq("id", teamId);
  if (error) throw error;

  await logAction({
    actorId: profileId,
    action: "team.rename",
    targetType: "team",
    targetId: teamId,
    metadata: { name: clean },
  });

  revalidatePath("/admin/teams");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteTeamAction(teamId: string): Promise<ActionResult> {
  const { profileId, role } = await requireProfile();
  requireAdmin(role);

  const admin = createAdminClient();
  // FK: team_members 는 cascade 로 삭제, documents.owner_team_id 는 set null
  // → 그 문서들은 visibility='team' 이어도 게이트의 owner_team_id is null 분기로
  //   admin/reviewer 외엔 안 보이게 안전하게 닫힌다.
  const { error } = await admin.from("teams").delete().eq("id", teamId);
  if (error) throw error;

  await logAction({
    actorId: profileId,
    action: "team.delete",
    targetType: "team",
    targetId: teamId,
  });

  revalidatePath("/admin/teams");
  revalidatePath("/");
  return { ok: true };
}

export async function addTeamMemberAction(
  teamId: string,
  memberProfileId: string,
): Promise<ActionResult> {
  const { profileId, role } = await requireProfile();
  requireAdmin(role);

  if (!teamId || !memberProfileId) return fail("팀과 사용자를 선택하세요.");

  const admin = createAdminClient();
  // 중복은 PK 충돌 → upsert 로 멱등 처리
  const { error } = await admin
    .from("team_members")
    .upsert(
      { team_id: teamId, profile_id: memberProfileId },
      { onConflict: "team_id,profile_id", ignoreDuplicates: true },
    );
  if (error) throw error;

  await logAction({
    actorId: profileId,
    action: "team.add_member",
    targetType: "team",
    targetId: teamId,
    metadata: { profileId: memberProfileId },
  });

  revalidatePath("/admin/teams");
  revalidatePath("/");
  return { ok: true };
}

export async function removeTeamMemberAction(
  teamId: string,
  memberProfileId: string,
): Promise<ActionResult> {
  const { profileId, role } = await requireProfile();
  requireAdmin(role);

  if (!teamId || !memberProfileId) return fail("팀과 사용자를 선택하세요.");

  const admin = createAdminClient();
  const { error } = await admin
    .from("team_members")
    .delete()
    .eq("team_id", teamId)
    .eq("profile_id", memberProfileId);
  if (error) throw error;

  await logAction({
    actorId: profileId,
    action: "team.remove_member",
    targetType: "team",
    targetId: teamId,
    metadata: { profileId: memberProfileId },
  });

  revalidatePath("/admin/teams");
  revalidatePath("/");
  return { ok: true };
}
