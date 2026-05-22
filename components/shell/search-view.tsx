"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { findPath, flatten, useWorkbench } from "@/lib/workbench-context";
import { recordPageStatAction } from "@/lib/actions/page-stats";
import type { DocContent, TreeNode } from "@/lib/types";
import { cn } from "@/lib/utils";

type Filter = "all" | "chapter" | "section" | "item";
type Hit = {
  node: TreeNode;
  matchedIn: "title" | "body";
  snippet?: string;
};

export function SearchView() {
  const {
    tree,
    searchQuery,
    setSearchQuery,
    setActiveId,
    locale,
    content,
  } = useWorkbench();
  const [filter, setFilter] = useState<Filter>("all");
  const [draft, setDraft] = useState(searchQuery);

  const hits = useMemo(
    () => search(tree, searchQuery, content),
    [tree, searchQuery, content],
  );
  const visible = useMemo(
    () => (filter === "all" ? hits : hits.filter((h) => h.node.type === filter)),
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
            onChange={(e) => setDraft(e.target.value)}
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
            {searchQuery ? `"${searchQuery}" — ${hits.length}건` : "검색어를 입력하세요"}
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
            const path = findPath(tree, h.node.id);
            const crumb = path.slice(0, -1).map((p) =>
              locale === "ko" ? p.label : p.labelEn ?? p.label,
            );
            const title = locale === "ko" ? h.node.label : h.node.labelEn ?? h.node.label;
            return (
              <li key={h.node.id}>
                <button
                  type="button"
                  onClick={() => {
                    // Bump search counter for the document the user picked
                    // out of the result list. View counter is bumped by
                    // MainPane when activeId changes.
                    void recordPageStatAction(h.node.id, "search");
                    setActiveId(h.node.id);
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
                      {LABEL[h.node.type as Filter]}
                    </span>
                    <span>일치: {h.matchedIn === "title" ? "제목" : "본문"}</span>
                    {h.node.badge === "PDF" && (
                      <span className="rounded bg-accent-softer px-1 font-en font-bold text-accent">
                        PDF
                      </span>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
          {visible.length === 0 && searchQuery && (
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

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function search(
  tree: TreeNode[],
  q: string,
  contentMap: Record<string, DocContent>,
): Hit[] {
  const lq = q.trim().toLowerCase();
  if (!lq) return [];
  const hits: Hit[] = [];
  for (const n of flatten(tree)) {
    const titles = [n.label, n.labelEn ?? ""].join(" ").toLowerCase();
    if (titles.includes(lq)) {
      hits.push({ node: n, matchedIn: "title" });
      continue;
    }
    const content = contentMap[n.id];
    if (content) {
      const text = stripHtml(content.body);
      const idx = text.toLowerCase().indexOf(lq);
      if (idx !== -1) {
        const start = Math.max(0, idx - 40);
        const end = Math.min(text.length, idx + q.length + 80);
        const snippet =
          (start > 0 ? "… " : "") + text.slice(start, end) + (end < text.length ? " …" : "");
        hits.push({ node: n, matchedIn: "body", snippet });
      }
    }
  }
  return hits;
}
