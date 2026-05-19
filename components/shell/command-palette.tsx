"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { File, FileText, Folder, Search } from "lucide-react";
import { findPath, flatten, useWorkbench } from "@/lib/workbench-context";
import { cn } from "@/lib/utils";
import type { TreeNode } from "@/lib/types";

export function CommandPalette() {
  const {
    tree,
    paletteOpen,
    setPaletteOpen,
    setActiveId,
    openSearch,
    locale,
  } = useWorkbench();
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (paletteOpen) {
      setQ("");
      setIdx(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [paletteOpen]);

  const all = useMemo(() => flatten(tree), [tree]);
  const results = useMemo(() => {
    const lq = q.trim().toLowerCase();
    const base = lq
      ? all.filter((n) => {
          const ko = n.label.toLowerCase();
          const en = (n.labelEn ?? "").toLowerCase();
          return ko.includes(lq) || en.includes(lq);
        })
      : all.filter((n) => n.type === "item").slice(0, 12);
    return base.slice(0, 30);
  }, [q, all]);

  useEffect(() => {
    setIdx(0);
  }, [q]);

  if (!paletteOpen) return null;

  const onPick = (n: TreeNode) => {
    setActiveId(n.id);
    setPaletteOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-[15vh]">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="close"
        onClick={() => setPaletteOpen(false)}
      />
      <div className="relative z-10 w-[640px] max-w-[90vw] overflow-hidden rounded-[var(--radius-lg)] border border-line bg-panel shadow-md">
        <div className="flex items-center gap-2 border-b border-line px-3.5 py-3">
          <Search size={15} className="text-ink-3" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="제목으로 빠른 이동 — Enter로 전체 검색"
            className="flex-1 border-0 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-4"
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIdx((i) => Math.min(i + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setIdx((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                if (results[idx]) onPick(results[idx]);
                else if (q.trim()) {
                  openSearch(q.trim());
                  setPaletteOpen(false);
                }
              } else if (e.key === "Escape") {
                e.preventDefault();
                setPaletteOpen(false);
              }
            }}
          />
          <kbd className="rounded border border-line bg-surface-2 px-1.5 py-px font-en text-[10.5px] text-ink-3">
            Esc
          </kbd>
        </div>

        <div className="max-h-[420px] overflow-y-auto py-1">
          {results.length === 0 && (
            <div className="px-4 py-6 text-center text-[12.5px] text-ink-3">
              결과 없음. Enter로 전체 검색.
            </div>
          )}
          {results.map((n, i) => {
            const path = findPath(tree, n.id);
            const crumb = path.slice(0, -1).map((p) =>
              locale === "ko" ? p.label : p.labelEn ?? p.label,
            );
            const label = locale === "ko" ? n.label : n.labelEn ?? n.label;
            const Icon =
              n.type === "chapter" ? Folder : n.type === "section" ? File : FileText;
            return (
              <button
                key={n.id}
                type="button"
                onMouseEnter={() => setIdx(i)}
                onClick={() => onPick(n)}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] text-ink-2 hover:bg-surface-2",
                  i === idx && "bg-accent-soft text-accent",
                )}
              >
                <Icon size={13} className="shrink-0 text-ink-3" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">
                    <Highlight text={label} q={q} />
                  </div>
                  {crumb.length > 0 && (
                    <div className="truncate text-[11px] text-ink-3">
                      {crumb.join(" / ")}
                    </div>
                  )}
                </div>
                {n.badge === "PDF" && (
                  <span className="rounded bg-accent-softer px-1 py-px font-en text-[9.5px] font-bold text-accent">
                    PDF
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t border-line bg-surface-2 px-3.5 py-1.5 text-[11px] text-ink-3">
          <span>
            <kbd className="rounded border border-line bg-panel px-1 font-en text-[10.5px]">
              ↑↓
            </kbd>{" "}
            이동{" "}
            <kbd className="ml-2 rounded border border-line bg-panel px-1 font-en text-[10.5px]">
              ↵
            </kbd>{" "}
            선택
          </span>
          <span className="font-mono">{results.length} hits</span>
        </div>
      </div>
    </div>
  );
}

function Highlight({ text, q }: { text: string; q: string }) {
  const lq = q.trim().toLowerCase();
  if (!lq) return <>{text}</>;
  const lower = text.toLowerCase();
  const idx = lower.indexOf(lq);
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-accent-softer px-0.5 text-accent">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}
