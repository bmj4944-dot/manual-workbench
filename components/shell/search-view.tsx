"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { findPath, useWorkbench } from "@/lib/workbench-context";
import { recordPageStatAction } from "@/lib/actions/page-stats";
import {
  searchDocumentsAction,
  type SearchHit,
} from "@/lib/actions/search";
import { cn } from "@/lib/utils";

type Filter = "all" | "chapter" | "section" | "item";

/**
 * Full-text search powered by the `search_documents(q)` RPC (C-7 infra +
 * C-7b wiring). Debounces user input by 250ms so we don't spam the server
 * on every keystroke; result list filters client-side by node type.
 */
export function SearchView() {
  const { tree, searchQuery, setSearchQuery, setActiveId, locale } =
    useWorkbench();
  const [filter, setFilter] = useState<Filter>("all");
  const [draft, setDraft] = useState(searchQuery);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);

  // Debounce: query the server 250ms after the user stops typing (or hits
  // Enter, which sets searchQuery immediately and triggers the same effect).
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setHits([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const id = window.setTimeout(async () => {
      const result = await searchDocumentsAction(q);
      setHits(result);
      setLoading(false);
    }, 250);
    return () => window.clearTimeout(id);
  }, [searchQuery]);

  // Keep the draft in sync when searchQuery changes from outside (palette).
  useEffect(() => {
    setDraft(searchQuery);
  }, [searchQuery]);

  const visible = useMemo(
    () => (filter === "all" ? hits : hits.filter((h) => h.type === filter)),
    [hits, filter],
  );

  const submit = () => setSearchQuery(draft.trim());

  return (
    <main className="min-h-0 overflow-y-auto bg-surface">
      <div className="mx-auto max-w-[820px] px-10 py-8">
        <h1 className="mb-4 text-[22px] font-bold tracking-tighter2 text-ink">
          전체 검색
        </h1>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="mb-4 flex items-center gap-2 rounded-[var(--radius-lg)] border border-line bg-panel px-4 py-2.5 shadow-sm focus-within:border-accent"
        >
          <Search size={16} className="text-ink-3" />
          <input
            autoFocus
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              // Live-search: push to global query so debounce kicks in.
              setSearchQuery(e.target.value);
            }}
            placeholder="장·절·내용 검색..."
            className="flex-1 border-0 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-4"
          />
          <button
            type="submit"
            className="rounded-md bg-accent px-3 py-1 text-[12.5px] font-medium text-white hover:opacity-90"
          >
            검색
          </button>
        </form>

        <div className="mb-3 flex items-center gap-2">
          <span className="text-[12.5px] text-ink-3">
            {searchQuery
              ? loading
                ? `"${searchQuery}" — 검색 중...`
                : `"${searchQuery}" — ${hits.length}건`
              : "검색어를 입력하세요"}
          </span>
          <span className="flex-1" />
          {(["all", "chapter", "section", "item"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-[11.5px]",
                filter === f
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-line bg-panel text-ink-2 hover:bg-surface-2",
              )}
            >
              {LABEL[f]}
            </button>
          ))}
        </div>

        <ul className="flex flex-col gap-2.5">
          {visible.map((h) => {
            const path = findPath(tree, h.id);
            const crumb = path.slice(0, -1).map((p) =>
              locale === "ko" ? p.label : p.labelEn ?? p.label,
            );
            const title = locale === "ko" ? h.label : h.labelEn ?? h.label;
            return (
              <li key={h.id}>
                <button
                  type="button"
                  onClick={() => {
                    // Bump search counter for the document the user picked
                    // out of the result list. View counter is bumped by
                    // MainPane when activeId changes.
                    void recordPageStatAction(h.id, "search");
                    setActiveId(h.id);
                  }}
                  className="block w-full rounded-[var(--radius-lg)] border border-line bg-panel p-4 text-left hover:border-accent hover:shadow-sm"
                >
                  <div className="mb-1 truncate text-[11.5px] text-ink-3">
                    {crumb.join(" / ")}
                  </div>
                  <div className="mb-1 text-[15px] font-semibold text-ink">
                    <Hl text={title} q={searchQuery} />
                  </div>
                  {h.snippet && (
                    <p className="line-clamp-2 text-[13px] text-ink-2">
                      <Hl text={h.snippet} q={searchQuery} />
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-ink-3">
                    <span className="rounded-full border border-line bg-surface-2 px-1.5 py-px">
                      {LABEL[h.type as Filter]}
                    </span>
                    <span>일치: {h.matchedIn === "title" ? "제목" : "본문"}</span>
                  </div>
                </button>
              </li>
            );
          })}
          {!loading && visible.length === 0 && searchQuery && (
            <li className="rounded-[var(--radius-lg)] border border-dashed border-line bg-surface-2 p-8 text-center text-[13px] text-ink-3">
              일치하는 결과가 없습니다.
            </li>
          )}
        </ul>
      </div>
    </main>
  );
}

const LABEL: Record<Filter, string> = {
  all: "전체",
  chapter: "장",
  section: "절",
  item: "항",
};

function Hl({ text, q }: { text: string; q: string }) {
  const lq = q.trim().toLowerCase();
  if (!lq) return <>{text}</>;
  const lower = text.toLowerCase();
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  let found = lower.indexOf(lq, cursor);
  while (found !== -1) {
    parts.push(text.slice(cursor, found));
    parts.push(
      <mark
        key={`m${found}`}
        className="rounded bg-accent-softer px-0.5 text-accent"
      >
        {text.slice(found, found + q.length)}
      </mark>,
    );
    cursor = found + q.length;
    found = lower.indexOf(lq, cursor);
  }
  parts.push(text.slice(cursor));
  return <>{parts}</>;
}
