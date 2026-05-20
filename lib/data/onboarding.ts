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
