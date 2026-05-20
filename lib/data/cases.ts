import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Case } from "@/lib/types";

type CaseRow = {
  id: string;
  title: string;
  summary: string;
  result: "good" | "bad" | "mixed";
  occurred_at: string;
  duration_text: string | null;
  channel: string | null;
  linked_document_id: string | null;
  agent: { name: string; initials: string; color: string } | null;
  transcript: Array<{ speaker: string; text: string; sort_order: number }>;
  lessons: Array<{ lesson: string; sort_order: number }>;
};

export async function fetchCases(): Promise<Case[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("cases")
    .select(
      `
        id, title, summary, result, occurred_at, duration_text, channel,
        linked_document_id,
        agent:profiles!agent_id(name, initials, color),
        transcript:case_transcript_lines(speaker, text, sort_order),
        lessons:case_lessons(lesson, sort_order)
      `,
    )
    .order("occurred_at", { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as unknown as CaseRow[];

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    summary: row.summary,
    result: row.result,
    date: row.occurred_at,
    duration: row.duration_text ?? "",
    channel: row.channel ?? "",
    agent: row.agent
      ? {
          name: row.agent.name,
          initials: row.agent.initials,
          color: row.agent.color,
        }
      : { name: "—", initials: "?", color: "oklch(0.6 0 0)" },
    linkedSection: row.linked_document_id ?? undefined,
    transcript: [...row.transcript]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(({ speaker, text }) => ({ who: speaker, text })),
    lessons: [...row.lessons]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((l) => l.lesson),
  }));
}
