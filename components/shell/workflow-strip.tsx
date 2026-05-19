"use client";

import { Check, ChevronRight } from "lucide-react";
import { findNode, useWorkbench } from "@/lib/workbench-context";
import type { NodeStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STAGES: { key: NodeStatus; ko: string; en: string; permission: string }[] = [
  { key: "draft", ko: "초안", en: "Draft", permission: "edit" },
  { key: "review", ko: "검토중", en: "In review", permission: "edit" },
  { key: "approved", ko: "승인", en: "Approved", permission: "approve" },
  { key: "published", ko: "공개", en: "Published", permission: "publish" },
];

export function WorkflowStrip() {
  const { tree, activeId, locale, setNodeStatus, can } = useWorkbench();
  const node = findNode(tree, activeId);
  if (!node) return null;
  const currentIdx = Math.max(
    0,
    STAGES.findIndex((s) => s.key === (node.status ?? "draft")),
  );
  const current = STAGES[currentIdx];
  const next = STAGES[currentIdx + 1];
  const prev = STAGES[currentIdx - 1];

  const advance = () => {
    if (next) setNodeStatus(activeId, next.key);
  };
  const revert = () => {
    if (prev) setNodeStatus(activeId, prev.key);
  };

  const canAdvance = next ? can(next.permission) : false;
  const canRevert = prev ? can(current.permission) : false;

  return (
    <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-4 py-2">
      <ol className="flex flex-1 items-center gap-1.5">
        {STAGES.map((s, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          return (
            <li key={s.key} className="flex items-center gap-1.5">
              <span
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium",
                  active && "bg-accent-soft text-accent",
                  done && "bg-[oklch(0.92_0.06_145)] text-[oklch(0.38_0.13_145)]",
                  !active && !done && "bg-panel text-ink-3",
                )}
              >
                {done ? (
                  <Check size={11} />
                ) : (
                  <span
                    className={cn(
                      "grid h-4 w-4 place-items-center rounded-full font-mono text-[9px]",
                      active ? "bg-accent text-white" : "bg-line-2 text-ink-3",
                    )}
                  >
                    {i + 1}
                  </span>
                )}
                {locale === "ko" ? s.ko : s.en}
              </span>
              {i < STAGES.length - 1 && (
                <ChevronRight size={12} className="text-ink-4" />
              )}
            </li>
          );
        })}
      </ol>

      <button
        type="button"
        onClick={revert}
        disabled={!canRevert}
        className={cn(
          "rounded-md border border-line bg-panel px-2.5 py-1 text-[12px] text-ink-2 hover:bg-surface-3",
          !canRevert && "cursor-not-allowed opacity-40 hover:bg-panel",
        )}
      >
        ← 이전 단계
      </button>
      <button
        type="button"
        onClick={advance}
        disabled={!next || !canAdvance}
        className={cn(
          "rounded-md bg-accent px-3 py-1 text-[12px] font-medium text-white hover:opacity-90",
          (!next || !canAdvance) && "cursor-not-allowed opacity-40 hover:opacity-40",
        )}
      >
        {next
          ? locale === "ko"
            ? `다음 단계 → ${next.ko}`
            : `Next → ${next.en}`
          : locale === "ko"
          ? "완료"
          : "Done"}
      </button>
    </div>
  );
}
