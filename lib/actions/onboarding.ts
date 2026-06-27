"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import {
  actionFail as fail,
  type ActionResult,
  requirePermission,
  requireProfile,
} from "./_helpers";
import { logAction } from "./_audit";

/**
 * 온보딩 관리 + 진행상황 영속화 server action.
 *  - task/question 관리: approve 권한자(admin·reviewer). service_role 로 쓰고
 *    audit 기록. (콘텐츠 관리 — cases/faqs 와 동일 패턴)
 *  - 진행상황 기록: 모든 인증 사용자(본인 것). user_id 는 서버에서 결정해
 *    client 가 스푸핑할 수 없다. onboarding_progress 쓰기 권한은 service_role
 *    에만 있어(0022) admin client 사용. 자기진행이라 audit 생략(노이즈 방지).
 */

const TYPES = ["read", "quiz", "practice"] as const;
type OnboardingType = (typeof TYPES)[number];

export type SaveOnboardingQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type SaveOnboardingTaskInput = {
  id?: string | null; // 없으면 신규
  type: OnboardingType;
  title: string;
  description?: string;
  sectionId?: string | null;
  estimate?: string;
  sortOrder: number;
  questions: SaveOnboardingQuestion[];
};

function newTaskId(): string {
  return `ob-${Math.random().toString(36).slice(2, 8)}`;
}

export async function saveOnboardingTaskAction(
  input: SaveOnboardingTaskInput,
): Promise<ActionResult<{ id: string }>> {
  const { profileId, role } = await requireProfile();
  requirePermission(role, "approve");

  const title = input.title.trim();
  if (!title) return fail("제목을 입력하세요.");
  if (!TYPES.includes(input.type)) return fail("유형이 올바르지 않습니다.");

  // quiz 면 문항 검증 — 보기 2개 이상 + 정답 인덱스 범위
  const questions =
    input.type === "quiz"
      ? input.questions
          .map((q) => ({
            question: q.question.trim(),
            options: q.options.map((o) => o.trim()).filter(Boolean),
            correctIndex: q.correctIndex,
            explanation: q.explanation.trim(),
          }))
          .filter((q) => q.question)
      : [];
  if (input.type === "quiz") {
    if (questions.length === 0) {
      return fail("퀴즈는 문항을 최소 1개 입력하세요.");
    }
    for (const q of questions) {
      if (q.options.length < 2) {
        return fail(`"${q.question}" 문항에 보기를 2개 이상 입력하세요.`);
      }
      if (q.correctIndex < 0 || q.correctIndex >= q.options.length) {
        return fail(`"${q.question}" 문항의 정답을 선택하세요.`);
      }
    }
  }

  const id = input.id?.trim() || newTaskId();
  const admin = createAdminClient();

  const { error: upErr } = await admin.from("onboarding_tasks").upsert(
    {
      id,
      type: input.type,
      title,
      description: input.description?.trim() || null,
      section_id: input.sectionId || null,
      estimate: input.estimate?.trim() || null,
      sort_order: Math.floor(input.sortOrder) || 0,
    },
    { onConflict: "id" },
  );
  if (upErr) throw upErr;

  // 문항 전체 교체
  const { error: delErr } = await admin
    .from("onboarding_questions")
    .delete()
    .eq("task_id", id);
  if (delErr) throw delErr;
  if (questions.length) {
    const { error: insErr } = await admin.from("onboarding_questions").insert(
      questions.map((q, i) => ({
        task_id: id,
        question: q.question,
        options: q.options,
        correct_index: q.correctIndex,
        explanation: q.explanation || null,
        sort_order: i,
      })),
    );
    if (insErr) throw insErr;
  }

  await logAction({
    actorId: profileId,
    action: "onboarding.save_task",
    targetType: "onboarding_task",
    targetId: id,
    metadata: { title, type: input.type, isNew: !input.id },
  });

  revalidatePath("/manage/onboarding");
  revalidatePath("/");
  return { ok: true, data: { id } };
}

export async function deleteOnboardingTaskAction(
  id: string,
): Promise<ActionResult> {
  const { profileId, role } = await requireProfile();
  requirePermission(role, "approve");

  if (!id) return fail("항목을 선택하세요.");

  const admin = createAdminClient();
  // FK: onboarding_questions / onboarding_progress 는 on delete cascade
  const { error } = await admin.from("onboarding_tasks").delete().eq("id", id);
  if (error) throw error;

  await logAction({
    actorId: profileId,
    action: "onboarding.delete_task",
    targetType: "onboarding_task",
    targetId: id,
  });

  revalidatePath("/manage/onboarding");
  revalidatePath("/");
  return { ok: true };
}

/**
 * 진행상황 토글 영속화. done=true 면 완료 기록(upsert), false 면 해제(delete).
 * 모든 인증 사용자가 본인 진행을 기록한다 — user_id 는 서버에서 결정.
 */
export async function recordOnboardingProgressAction(
  taskId: string,
  done: boolean,
  score?: number | null,
): Promise<ActionResult> {
  const { profileId } = await requireProfile();
  if (!taskId) return fail("항목이 올바르지 않습니다.");

  const admin = createAdminClient();
  if (done) {
    const { error } = await admin.from("onboarding_progress").upsert(
      {
        user_id: profileId,
        task_id: taskId,
        score: score ?? null,
      },
      { onConflict: "user_id,task_id" },
    );
    if (error) throw error;
  } else {
    const { error } = await admin
      .from("onboarding_progress")
      .delete()
      .eq("user_id", profileId)
      .eq("task_id", taskId);
    if (error) throw error;
  }
  return { ok: true };
}
