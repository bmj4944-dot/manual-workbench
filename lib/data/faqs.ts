import "server-only";
import { createClient } from "@/lib/supabase/server";
import { FAQ_LIST } from "@/lib/sample-data";
import type { FaqItem } from "@/lib/types";

type SourceRow = {
  document_id: string | null;
  confidence: number | null;
  snippet: string | null;
  sort_order: number;
};

type FaqRow = {
  id: string;
  question: string;
  answer: string;
  confidence: number;
  tags: string[] | null;
  asked_count: number;
  sort_order: number;
  sources: SourceRow[];
};

const SELECT = `
  id, question, answer, confidence, tags, asked_count, sort_order,
  sources:faq_sources(document_id, confidence, snippet, sort_order)
`;

/**
 * 뷰(faq-view)용. FaqItem 형태로 매핑. sources.id 는 연결 문서 id(없으면 "").
 */
export async function fetchFaqs(): Promise<FaqItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("faqs")
    .select(SELECT)
    .order("sort_order")
    .order("created_at");
  if (error) {
    // 마이그 0031 적용 전(테이블 없음, 42P01)이면 기존 하드코딩으로 폴백 —
    // FAQ 만 영향, 워크벤치 전체 fetch 가 함께 죽지 않게 한다.
    if ((error as { code?: string }).code === "42P01") return FAQ_LIST;
    throw error;
  }

  const rows = (data ?? []) as unknown as FaqRow[];

  return rows.map((row) => ({
    q: row.question,
    a: row.answer,
    confidence: row.confidence,
    tags: row.tags ?? [],
    askedCount: row.asked_count,
    sources: [...row.sources]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((s) => ({
        id: s.document_id ?? "",
        confidence: s.confidence ?? 0,
        snippet: s.snippet ?? "",
      })),
  }));
}

// ─────────────────────────────────────────────────────────────
// 관리(/manage/faq) 전용 — DB id(uuid) + source 원본 보존.
// ─────────────────────────────────────────────────────────────
export type ManageFaqSource = {
  documentId: string | null;
  confidence: number;
  snippet: string;
};

export type ManageFaq = {
  id: string;
  question: string;
  answer: string;
  confidence: number;
  tags: string[];
  askedCount: number;
  sortOrder: number;
  sources: ManageFaqSource[];
};

export async function fetchFaqsForManage(): Promise<ManageFaq[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("faqs")
    .select(SELECT)
    .order("sort_order")
    .order("created_at");
  if (error) throw error;

  const rows = (data ?? []) as unknown as FaqRow[];

  return rows.map((row) => ({
    id: row.id,
    question: row.question,
    answer: row.answer,
    confidence: row.confidence,
    tags: row.tags ?? [],
    askedCount: row.asked_count,
    sortOrder: row.sort_order,
    sources: [...row.sources]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((s) => ({
        documentId: s.document_id,
        confidence: s.confidence ?? 0,
        snippet: s.snippet ?? "",
      })),
  }));
}
