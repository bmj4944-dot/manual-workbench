import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { OnboardingQuestion, OnboardingTask } from "@/lib/types";

type TaskRow = {
  id: string;
  type: "read" | "quiz" | "practice";
  title: string;
  description: string | null;
  section_id: string | null;
  estimate: string | null;
  sort_order: number;
  questions: Array<{
    question: string;
    options: string[];
    correct_index: number;
    explanation: string | null;
    sort_order: number;
  }>;
};

export async function fetchOnboardingTasks(): Promise<OnboardingTask[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("onboarding_tasks")
    .select(
      `
        id, type, title, description, section_id, estimate, sort_order,
        questions:onboarding_questions(question, options, correct_index, explanation, sort_order)
      `,
    )
    .order("sort_order");

  if (error) throw error;

  const rows = (data ?? []) as unknown as TaskRow[];

  return rows.map((row) => {
    const questions: OnboardingQuestion[] = [...(row.questions ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((q) => ({
        q: q.question,
        opts: q.options,
        correct: q.correct_index,
        explain: q.explanation ?? "",
      }));

    return {
      id: row.id,
      type: row.type,
      title: row.title,
      desc: row.description ?? undefined,
      sectionId: row.section_id ?? undefined,
      estimate: row.estimate ?? undefined,
      ...(questions.length > 0 ? { questions } : {}),
    };
  });
}

// ─────────────────────────────────────────────────────────────
// 관리(/manage/onboarding) 전용 — sort_order + 문항 raw 보존.
// ─────────────────────────────────────────────────────────────
export type ManageOnboardingQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type ManageOnboardingTask = {
  id: string;
  type: "read" | "quiz" | "practice";
  title: string;
  description: string;
  sectionId: string | null;
  estimate: string;
  sortOrder: number;
  questions: ManageOnboardingQuestion[];
};

type ManageTaskRow = {
  id: string;
  type: "read" | "quiz" | "practice";
  title: string;
  description: string | null;
  section_id: string | null;
  estimate: string | null;
  sort_order: number;
  questions: Array<{
    question: string;
    options: string[];
    correct_index: number;
    explanation: string | null;
    sort_order: number;
  }>;
};

export async function fetchOnboardingTasksForManage(): Promise<
  ManageOnboardingTask[]
> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("onboarding_tasks")
    .select(
      `
        id, type, title, description, section_id, estimate, sort_order,
        questions:onboarding_questions(question, options, correct_index, explanation, sort_order)
      `,
    )
    .order("sort_order");
  if (error) throw error;

  const rows = (data ?? []) as unknown as ManageTaskRow[];

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    description: row.description ?? "",
    sectionId: row.section_id,
    estimate: row.estimate ?? "",
    sortOrder: row.sort_order,
    questions: [...(row.questions ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((q) => ({
        question: q.question,
        options: q.options,
        correctIndex: q.correct_index,
        explanation: q.explanation ?? "",
      })),
  }));
}

/**
 * 현재 사용자의 온보딩 진행상황(완료한 task id 목록). 로그인 안 했으면 빈 값.
 * onboarding_progress 는 authenticated_read(using true)라 본인 user_id 로 필터.
 */
export async function fetchOnboardingProgress(): Promise<{
  doneIds: string[];
}> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { doneIds: [] };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  const profileId = (profile as { id?: string } | null)?.id;
  if (!profileId) return { doneIds: [] };

  const { data, error } = await supabase
    .from("onboarding_progress")
    .select("task_id")
    .eq("user_id", profileId);
  if (error) throw error;

  return {
    doneIds: ((data ?? []) as { task_id: string }[]).map((r) => r.task_id),
  };
}
