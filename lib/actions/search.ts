"use server";

import { createClient } from "@/lib/supabase/server";

type NodeType = "chapter" | "section" | "item";

export type SearchHit = {
  id: string;
  label: string;
  labelEn: string | null;
  type: NodeType;
  parentId: string | null;
  matchedIn: "title" | "body";
  snippet: string | null;
  rank: number;
};

type RpcRow = {
  id: string;
  label: string;
  label_en: string | null;
  type: NodeType;
  parent_id: string | null;
  matched_in: "title" | "body";
  snippet: string | null;
  rank: number;
};

/**
 * Server-side full-text search via the `search_documents(q)` RPC (migration
 * 0018). Returns ranked hits with HTML-stripped snippets. Empty / blank `q`
 * short-circuits to [] without a round-trip.
 */
export async function searchDocumentsAction(q: string): Promise<SearchHit[]> {
  const trimmed = q.trim();
  if (!trimmed) return [];

  const supabase = createClient();
  const { data, error } = await supabase.rpc("search_documents", {
    q: trimmed,
  });
  if (error) {
    console.error("searchDocumentsAction failed", error);
    return [];
  }

  return ((data ?? []) as RpcRow[]).map((r) => ({
    id: r.id,
    label: r.label,
    labelEn: r.label_en,
    type: r.type,
    parentId: r.parent_id,
    matchedIn: r.matched_in,
    snippet: r.snippet,
    rank: r.rank,
  }));
}
