import "server-only";
import { createClient } from "@/lib/supabase/server";
import { relativeKo } from "./relative-time";
import type { Comment } from "@/lib/types";

type CommentRow = {
  id: string;
  document_id: string;
  body: string;
  resolved: boolean;
  created_at: string;
  parent_comment_id: string | null;
  author: { name: string; initials: string; color: string } | null;
};

export async function fetchComments(): Promise<Record<string, Comment[]>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("comments")
    .select(
      "id, document_id, body, resolved, created_at, parent_comment_id, author:profiles!author_id(name, initials, color)",
    )
    .order("created_at", { ascending: false });
  if (error) throw error;

  const out: Record<string, Comment[]> = {};
  for (const r of (data ?? []) as unknown as CommentRow[]) {
    const comment: Comment = {
      id: r.id,
      body: r.body,
      resolved: r.resolved,
      when: relativeKo(new Date(r.created_at)),
      who: r.author?.name ?? "—",
      initials: r.author?.initials ?? "?",
      color: r.author?.color ?? "oklch(0.6 0 0)",
      parentId: r.parent_comment_id,
    };
    if (!out[r.document_id]) out[r.document_id] = [];
    out[r.document_id].push(comment);
  }
  return out;
}
