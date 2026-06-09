import "server-only";
import { createClient } from "@/lib/supabase/server";
import { relativeKo } from "./relative-time";
import { sanitizeBodyHtml } from "@/lib/sanitize";
import type { DocContent } from "@/lib/types";

type ContentRow = {
  document_id: string;
  tags: string[] | null;
  version: string;
  body: string;
  pdf_title: string | null;
  pdf_pages: number | null;
  pdf_storage_path: string | null;
  updated_at: string;
  author_id: string | null;
};

type ProfileRow = { id: string; name: string };

export async function fetchDocumentContent(): Promise<Record<string, DocContent>> {
  const supabase = createClient();

  const [contentResult, profilesResult] = await Promise.all([
    supabase
      .from("document_content")
      .select(
        "document_id, tags, version, body, pdf_title, pdf_pages, pdf_storage_path, updated_at, author_id",
      ),
    supabase.from("profiles").select("id, name"),
  ]);

  if (contentResult.error) throw contentResult.error;

  const nameById = new Map<string, string>();
  for (const p of (profilesResult.data ?? []) as unknown as ProfileRow[]) {
    nameById.set(p.id, p.name);
  }

  const map: Record<string, DocContent> = {};
  for (const row of (contentResult.data ?? []) as unknown as ContentRow[]) {
    const author = row.author_id ? nameById.get(row.author_id) ?? "" : "";
    const isPdf = !!row.pdf_title || !!row.pdf_storage_path;
    map[row.document_id] = {
      tags: row.tags ?? [],
      version: row.version,
      // 읽기 경로 방어 — 레거시(미정제) 본문도 클라이언트엔 정제된 채 전달.
      body: sanitizeBodyHtml(row.body),
      author,
      updated: relativeKo(new Date(row.updated_at)),
      ...(isPdf ? { type: "pdf" as const } : {}),
      ...(row.pdf_title ? { pdfTitle: row.pdf_title } : {}),
      ...(row.pdf_pages ? { pdfPages: row.pdf_pages } : {}),
      ...(row.pdf_storage_path ? { pdfStoragePath: row.pdf_storage_path } : {}),
    };
  }

  return map;
}
