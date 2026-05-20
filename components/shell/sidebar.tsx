"use client";

import { Plus, Search, Sparkles, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { findNode, useWorkbench } from "@/lib/workbench-context";
import { t } from "@/lib/i18n";
import { TocTree } from "@/components/toc/toc-tree";
import type { TreeNode } from "@/lib/types";

function countLeaves(nodes: TreeNode[]): number {
  let n = 0;
  for (const node of nodes) {
    if (node.type === "item") n += 1;
    if (node.children) n += countLeaves(node.children);
  }
  return n;
}

function filterTree(nodes: TreeNode[], q: string): TreeNode[] {
  if (!q.trim()) return nodes;
  const lq = q.toLowerCase();
  const out: TreeNode[] = [];
  for (const n of nodes) {
    const labelHit =
      n.label.toLowerCase().includes(lq) ||
      (n.labelEn ?? "").toLowerCase().includes(lq);
    const kids = n.children ? filterTree(n.children, q) : undefined;
    if (labelHit || (kids && kids.length)) {
      out.push({ ...n, open: true, children: kids ?? n.children });
    }
  }
  return out;
}

export function Sidebar() {
  const {
    tree,
    locale,
    favorites,
    setActiveId,
    whatsNewRead,
    markWhatsNewRead,
    whatsNew,
  } = useWorkbench();
  const [q, setQ] = useState("");
  const filtered = useMemo(() => filterTree(tree, q), [tree, q]);
  const total = useMemo(() => countLeaves(tree), [tree]);
  const unread = whatsNew.filter((w) => !whatsNewRead.has(w.id));
  const topWhatsNew = unread.slice(0, 2);

  return (
    <aside className="flex min-h-0 flex-col border-r border-line bg-surface-2">
      <div className="flex items-center justify-between border-b border-line px-3.5 py-3">
        <h2 className="text-[13px] font-semibold tracking-tighter1 text-ink">
          {t(locale, "tocTitle")}
        </h2>
        <button
          type="button"
          className="grid h-6 w-6 place-items-center rounded-md text-ink-3 hover:bg-surface-3 hover:text-ink"
          aria-label={t(locale, "addChapter")}
        >
          <Plus size={14} />
        </button>
      </div>

      <div className="px-3.5 py-2.5">
        <label className="flex items-center gap-2 rounded-[var(--radius)] border border-line bg-panel px-2 py-1.5 text-ink-3 focus-within:border-accent">
          <Search size={13} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t(locale, "tocSearch")}
            className="min-w-0 flex-1 border-0 bg-transparent text-[12.5px] text-ink outline-none placeholder:text-ink-4"
          />
        </label>
      </div>

      {topWhatsNew.length > 0 && (
        <section className="mx-3 mb-2 rounded-[var(--radius)] border border-accent-softer bg-accent-soft/40 p-2.5">
          <div className="mb-1.5 flex items-center gap-1.5 text-[10.5px] font-en font-bold uppercase tracking-[0.08em] text-accent">
            <Sparkles size={11} /> What&apos;s new
          </div>
          <ul className="flex flex-col gap-1">
            {topWhatsNew.map((w) => (
              <li key={w.id}>
                <button
                  type="button"
                  onClick={() => {
                    markWhatsNewRead(w.id);
                    setActiveId(w.id);
                  }}
                  className="flex w-full items-start gap-1.5 rounded text-left text-[12px] text-ink-2 hover:text-ink"
                >
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  <div className="min-w-0">
                    <div className="truncate font-medium">{w.what}</div>
                    <div className="text-[10.5px] text-ink-3">
                      {w.who} · {w.when}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {favorites.length > 0 && (
        <section className="mx-3 mb-2 rounded-[var(--radius)] border border-line bg-panel p-2.5">
          <div className="mb-1.5 flex items-center gap-1.5 text-[10.5px] font-en font-bold uppercase tracking-[0.08em] text-ink-3">
            <Star size={11} className="text-warn" /> 즐겨찾기
          </div>
          <ul className="flex flex-col gap-0.5">
            {favorites.map((id) => {
              const n = findNode(tree, id);
              if (!n) return null;
              const label = locale === "ko" ? n.label : n.labelEn ?? n.label;
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(id)}
                    className="block w-full truncate rounded px-1.5 py-0.5 text-left text-[12px] text-ink-2 hover:bg-surface-2 hover:text-ink"
                  >
                    {label}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        <TocTree nodes={filtered} />
      </div>

      <div className="border-t border-line px-3.5 py-2 text-[11.5px] text-ink-3">
        {total} {t(locale, "items")} · {favorites.length}★
      </div>
    </aside>
  );
}
