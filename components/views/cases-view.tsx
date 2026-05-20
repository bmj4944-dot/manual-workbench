"use client";

import { useMemo, useState } from "react";
import { Clock, Link2, Phone, X } from "lucide-react";
import { findNode, useWorkbench } from "@/lib/workbench-context";
import type { Case } from "@/lib/types";
import { cn } from "@/lib/utils";

type Filter = "all" | "good" | "bad" | "mixed";

const RESULT: Record<Case["result"], { ko: string; cls: string }> = {
  good: { ko: "우수", cls: "bg-ok/15 text-ok border-ok/30" },
  bad: { ko: "실패", cls: "bg-[oklch(0.95_0.06_28_/_0.4)] text-[oklch(0.45_0.18_28)] border-[oklch(0.80_0.18_28_/_0.4)]" },
  mixed: { ko: "복합", cls: "bg-warn/15 text-warn border-warn/40" },
};

export function CasesView() {
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<Case | null>(null);
  const { setActiveId, tree, cases } = useWorkbench();
  const visible = useMemo(
    () => (filter === "all" ? cases : cases.filter((c) => c.result === filter)),
    [filter, cases],
  );
  const good = cases.filter((c) => c.result === "good").length;
  const bad = cases.filter((c) => c.result === "bad").length;
  const mixed = cases.filter((c) => c.result === "mixed").length;

  return (
    <main className="min-h-0 overflow-y-auto bg-surface">
      <div className="mx-auto max-w-[1080px] px-10 py-8">
        <h1 className="mb-1 text-[22px] font-bold tracking-tighter2 text-ink">
          응대 사례 라이브러리
        </h1>
        <p className="mb-5 text-[13px] text-ink-3">
          실제 통화·CS 사례에서 도출된 교훈을 검색·학습합니다.
        </p>

        <div className="mb-5 grid grid-cols-4 gap-3">
          <Hero label="총 사례" value={`${cases.length}`} />
          <Hero label="우수" value={`${good}`} tone="ok" />
          <Hero label="실패" value={`${bad}`} tone="bad" />
          <Hero label="복합" value={`${mixed}`} tone="warn" />
        </div>

        <div className="mb-4 flex items-center gap-2">
          {(["all", "good", "bad", "mixed"] as Filter[]).map((f) => (
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
              {f === "all" ? "전체" : RESULT[f].ko}
            </button>
          ))}
        </div>

        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {visible.map((c) => {
            const node = c.linkedSection ? findNode(tree, c.linkedSection) : null;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setOpen(c)}
                  className="flex h-full w-full flex-col rounded-[var(--radius-lg)] border border-line bg-panel p-4 text-left hover:border-accent hover:shadow-sm"
                >
                  <div className="mb-1.5 flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[11px] font-medium",
                        RESULT[c.result].cls,
                      )}
                    >
                      {RESULT[c.result].ko}
                    </span>
                    <span className="font-mono text-[11px] text-ink-3">
                      {c.id}
                    </span>
                    <span className="flex-1" />
                    <span className="font-mono text-[10.5px] text-ink-4">
                      {c.date}
                    </span>
                  </div>
                  <h3 className="mb-1.5 text-[14.5px] font-semibold text-ink">
                    {c.title}
                  </h3>
                  <p className="mb-3 line-clamp-3 text-[12.5px] leading-relaxed text-ink-2">
                    {c.summary}
                  </p>
                  <div className="mt-auto flex flex-wrap items-center gap-3 text-[11.5px] text-ink-3">
                    <span className="flex items-center gap-1">
                      <span
                        className="grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold text-white"
                        style={{ background: c.agent.color }}
                      >
                        {c.agent.initials}
                      </span>
                      {c.agent.name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone size={11} /> {c.channel}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={11} /> {c.duration}
                    </span>
                    {node && (
                      <span className="ml-auto flex items-center gap-1 text-accent">
                        <Link2 size={11} /> {node.label}
                      </span>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        {visible.length === 0 && (
          <div className="rounded-[var(--radius-lg)] border border-dashed border-line bg-surface-2 px-6 py-12 text-center text-[13px] text-ink-3">
            조건에 맞는 사례가 없습니다.
          </div>
        )}
      </div>

      {open && (
        <CaseModal
          c={open}
          onClose={() => setOpen(null)}
          onJump={(id) => {
            setActiveId(id);
            setOpen(null);
          }}
        />
      )}
    </main>
  );
}

function Hero({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn" | "bad";
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-line bg-panel p-4">
      <div className="mb-1.5 text-[11px] font-en font-bold uppercase tracking-[0.08em] text-ink-3">
        {label}
      </div>
      <div
        className={cn(
          "font-en text-[26px] font-bold leading-none",
          tone === "ok" && "text-ok",
          tone === "warn" && "text-warn",
          tone === "bad" && "text-[oklch(0.55_0.18_28)]",
          !tone && "text-ink",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function CaseModal({
  c,
  onClose,
  onJump,
}: {
  c: Case;
  onClose: () => void;
  onJump: (id: string) => void;
}) {
  const { tree } = useWorkbench();
  const node = c.linkedSection ? findNode(tree, c.linkedSection) : null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[6vh]">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="close"
        onClick={onClose}
      />
      <div className="relative z-10 w-[760px] max-w-[92vw] overflow-hidden rounded-[var(--radius-lg)] border border-line bg-panel shadow-md">
        <header className="flex items-start gap-3 border-b border-line px-5 py-4">
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[11px] font-medium",
              RESULT[c.result].cls,
            )}
          >
            {RESULT[c.result].ko}
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[11px] text-ink-3">{c.id}</div>
            <h2 className="mt-0.5 text-[16px] font-semibold text-ink">
              {c.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink"
          >
            <X size={14} />
          </button>
        </header>

        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
          <p className="mb-4 text-[13px] leading-relaxed text-ink-2">
            {c.summary}
          </p>

          <h3 className="mb-2 text-[11px] font-en font-bold uppercase tracking-[0.08em] text-ink-3">
            통화 발췌
          </h3>
          <ol className="mb-4 flex flex-col gap-1.5 rounded-[var(--radius)] border border-line bg-surface-2 px-3 py-3 font-mono text-[12px] leading-relaxed">
            {c.transcript.map((t, i) => (
              <li key={i} className="flex gap-2">
                <span
                  className={cn(
                    "w-12 shrink-0 text-right",
                    t.who === "고객" ? "text-ink-3" : "text-accent",
                  )}
                >
                  {t.who}
                </span>
                <span className="flex-1 text-ink-2">{t.text}</span>
              </li>
            ))}
          </ol>

          <h3 className="mb-2 text-[11px] font-en font-bold uppercase tracking-[0.08em] text-ink-3">
            교훈
          </h3>
          <ul className="mb-4 list-disc pl-5 text-[12.5px] leading-relaxed text-ink-2">
            {c.lessons.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>

          {node && (
            <div className="rounded-[var(--radius)] border border-accent-softer bg-accent-soft/40 px-3 py-2.5">
              <div className="mb-1 text-[11px] font-en font-bold uppercase tracking-[0.08em] text-accent">
                관련 매뉴얼
              </div>
              <button
                type="button"
                onClick={() => onJump(node.id)}
                className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink hover:underline"
              >
                <Link2 size={12} className="text-accent" />
                {node.label}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
