import "server-only";
import { createClient } from "@/lib/supabase/server";
import { relativeKo } from "./relative-time";
import type { Version } from "@/lib/types";

type VersionRow = {
  id: string;
  document_id: string;
  version_label: string;
  description: string;
  body: string;
  tag: "approved" | "published" | null;
  created_at: string;
  author: { name: string } | null;
};

export async function fetchHistory(): Promise<Record<string, Version[]>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("document_versions")
    .select(
      "id, document_id, version_label, description, body, tag, created_at, author:profiles!author_id(name)",
    )
    .order("created_at", { ascending: false });
  if (error) throw error;

  const out: Record<string, Version[]> = {};
  for (const r of (data ?? []) as unknown as VersionRow[]) {
    const version: Version = {
      id: r.id,
      v: r.version_label,
      who: r.author?.name ?? "—",
      when: relativeKo(new Date(r.created_at)),
      desc: r.description,
      body: r.body,
      ...(r.tag ? { tag: r.tag } : {}),
    };
    if (!out[r.document_id]) out[r.document_id] = [];
    out[r.document_id].push(version);
  }
  return out;
}
