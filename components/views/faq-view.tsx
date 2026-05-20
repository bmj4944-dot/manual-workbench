"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Link2, Search } from "lucide-react";
import { findNode, useWorkbench } from "@/lib/workbench-context";
import type { FaqItem } from "@/lib/types";
import { cn } from "@/lib/utils";

export function FaqView() {
  const { faqs, tree, setActiveId } = useWorkbench();
  const [open, setOpen] = useState<Set<number>>(new Set([0]));
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return faqs;
    return faqs.filter(
      (f) =>
        f.q.toLowerCase().includes(q) ||
        f.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [faqs, filter]);

  const total = faqs.length;
  const high = faqs.filter((f) => f.confidence >= 0.85).length;
  const low = faqs.filter((f) => f.confidence < 0.7).length;
  const totalAsked = faqs.reduce((s, f) => s + f.askedCount, 0);

  const toggle = (i: number) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <main className="min-h-0 overflow-y-auto bg-surface">
      <div className="mx-auto max-w-[920px] px-10 py-8">
        <h1 className="mb-1 text-[22px] font-bold tracking-tighter2 text-ink">
          FAQ — 매뉴얼 자동 매핑
        </h1>
        <p className="mb-5 text-[13px] text-ink-3">
          고객 자주 묻는 질문을 자동으로 매뉴얼 항목과 매칭하고,
          답변·신뢰도를 보여줍니다. 신뢰도 낮은 항목은 매뉴얼 보강이 필요합니다.
        </p>

        <div className="mb-5 grid grid-cols-4 gap-3">
          <Stat label="전체 FAQ" value={`${total}`} suffix="건" />
          <Stat label="신뢰도 높음 (≥85%)" value={`${high}`} tone="ok" />
          <Stat label="매뉴얼 보강 필요" value={`${low}`} tone="bad" />
          <Stat label="월 누적 질문수" value={totalAsked.toLocaleString()} />
        </div>

        <div className="mb-4 flex items-center gap-2 rounded-[var(--radius)] border border-line bg-panel px-3 py-2 focus-within:border-accent">
          <Search size={14} className="text-ink-3" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="질문이나 태그로 검색"
            className="min-w-0 flex-1 border-0 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-4"
          />
        </div>

        <ul className="flex flex-col gap-2">
          {filtered.map((item, i) => (
            <FaqRow
              key={i}
              item={item}
              open={open.has(i)}
              onToggle={() => toggle(i)}
              onJump={(id) => setActiveId(id)}
              labelOf={(id) => findNode(tree, id)?.label ?? id}
            />
          ))}
          {filtered.length === 0 && (
            <li className="rounded-[var(--radius-lg)] border border-dashed border-line bg-surface-2 px-6 py-12 text-center text-[13px] text-ink-3">
              일치하는 FAQ가 없습니다.
            </li>
          )}
        </ul>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  suffix,
  tone,
}: {
  label: string;
  value: string;
  suffix?: string;
  tone?: "ok" | "warn" | "bad";
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-line bg-panel p-4">
      <div className="mb-2 text-[11px] font-en font-bold uppercase tracking-[0.08em] text-ink-3">
        {label}
      </div>
      <div
        className={cn(
          "font-en text-[26px] font-bold leading-none tracking-tighter1",
          tone === "ok" && "text-[oklch(0.40_0.13_145)]",
          tone === "warn" && "text-warn",
          tone === "bad" && "text-[oklch(0.45_0.16_25)]",
          !tone && "text-ink",
        )}
      >
        {value}
        {suffix && (
          <span className="ml-1 text-[12px] font-normal text-ink-3">{suffix}</span>
        )}
      </div>
    </div>
  );
}

function FaqRow({
  item,
  open,
  onToggle,
  onJump,
  labelOf,
}: {
  item: FaqItem;
  open: boolean;
  onToggle: () => void;
  onJump: (id: string) => void;
  labelOf: (id: string) => string;
}) {
  const cpct = Math.round(item.confidence * 100);
  const tone =
    item.confidence >= 0.85
      ? "ok"
      : item.confidence >= 0.7
      ? "warn"
      : "bad";

  return (
    <li
      className={cn(
        "rounded-[var(--radius-lg)] border bg-panel",
        tone === "ok" && "border-line",
        tone === "warn" && "border-warn/30",
        tone === "bad" && "border-[oklch(0.80_0.18_28_/_0.4)]",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-3 p-4 text-left"
      >
        {open ? (
          <ChevronDown size={16} className="mt-0.5 text-ink-3" />
        ) : (
          <ChevronRight size={16} className="mt-0.5 text-ink-3" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-semibold text-ink">{item.q}</h3>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11.5px] text-ink-3">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 font-mono text-[10.5px] font-medium",
                tone === "ok" &&
                  "bg-[oklch(0.92_0.06_145_/_0.5)] text-[oklch(0.32_0.13_145)]",
                tone === "warn" && "bg-warn/15 text-warn",
                tone === "bad" &&
                  "bg-[oklch(0.95_0.06_28_/_0.4)] text-[oklch(0.45_0.18_28)]",
              )}
            >
              신뢰도 {cpct}%
            </span>
            <span>월 {item.askedCount}회</span>
            <span>·</span>
            <div className="flex gap-1">
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-line px-1.5 py-px text-[10.5px] text-ink-2"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </button>

      {open && (
        <div className="border-t border-line px-4 pb-4 pt-3">
          <p className="text-[13px] leading-relaxed text-ink-2">{item.a}</p>
          <h4 className="mt-4 mb-2 text-[10.5px] font-en font-bold uppercase tracking-[0.08em] text-ink-3">
            매뉴얼 소스
          </h4>
          <ul className="flex flex-col gap-1.5">
            {item.sources.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onJump(s.id)}
                  className="flex w-full items-center gap-2 rounded-md border border-line bg-surface-2 px-3 py-2 text-left text-[12.5px] text-ink-2 hover:border-accent hover:text-ink"
                >
                  <Link2 size={11} className="text-accent" />
                  <span className="font-medium">{labelOf(s.id)}</span>
                  <span className="font-mono text-[11px] text-ink-3">
                    — {s.snippet}
                  </span>
                  <span className="ml-auto font-mono text-[10.5px] text-ink-3">
                    {Math.round(s.confidence * 100)}%
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}
