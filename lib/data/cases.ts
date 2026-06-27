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

// ─────────────────────────────────────────────────────────────
// 관리(/manage/cases) 전용. fetchCases 는 뷰 형태로 매핑돼 agent_id / sort
// 같은 편집에 필요한 raw 값을 잃으므로 별도 조회를 둔다.
// ─────────────────────────────────────────────────────────────
export type ManageCaseLine = { speaker: string; text: string };

export type ManageCase = {
  id: string;
  title: string;
  summary: string;
  result: "good" | "bad" | "mixed";
  occurredAt: string;
  durationText: string;
  channel: string;
  agentId: string | null;
  linkedDocumentId: string | null;
  transcript: ManageCaseLine[];
  lessons: string[];
};

type ManageCaseRow = {
  id: string;
  title: string;
  summary: string;
  result: "good" | "bad" | "mixed";
  occurred_at: string;
  duration_text: string | null;
  channel: string | null;
  agent_id: string | null;
  linked_document_id: string | null;
  transcript: Array<{ speaker: string; text: string; sort_order: number }>;
  lessons: Array<{ lesson: string; sort_order: number }>;
};

export async function fetchCasesForManage(): Promise<ManageCase[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("cases")
    .select(
      `
        id, title, summary, result, occurred_at, duration_text, channel,
        agent_id, linked_document_id,
        transcript:case_transcript_lines(speaker, text, sort_order),
        lessons:case_lessons(lesson, sort_order)
      `,
    )
    .order("occurred_at", { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as unknown as ManageCaseRow[];

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    summary: row.summary,
    result: row.result,
    occurredAt: row.occurred_at,
    durationText: row.duration_text ?? "",
    channel: row.channel ?? "",
    agentId: row.agent_id,
    linkedDocumentId: row.linked_document_id,
    transcript: [...row.transcript]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(({ speaker, text }) => ({ speaker, text })),
    lessons: [...row.lessons]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((l) => l.lesson),
  }));
}
