"use client";

import { Check } from "lucide-react";
import { findNode, useWorkbench } from "@/lib/workbench-context";
import type { NodeStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STAGES: { key: NodeStatus; ko: string; en: string; permission: string }[] = [
  { key: "draft", ko: "초안", en: "Draft", permission: "edit" },
  { key: "review", ko: "검토", en: "Review", permission: "edit" },
  { key: "approved", ko: "승인", en: "Approve", permission: "approve" },
  { key: "published", ko: "공개", en: "Publish", permission: "publish" },
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
    <div className="wf-strip">
      {STAGES.map((s, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        const last = i === STAGES.length - 1;
        return (
          <span key={s.key} style={{ display: "contents" }}>
            <div
              className={cn(
                "step",
                done && "done",
                active && "active",
              )}
            >
              <span className="circ">
                {done ? <Check size={10} /> : i + 1}
              </span>
              <span>{locale === "ko" ? s.ko : s.en}</span>
            </div>
            {!last && <span className="line" />}
          </span>
        );
      })}

      <div className="actions">
        <button
          type="button"
          className="wf-btn"
          onClick={revert}
          disabled={!canRevert}
        >
          ← {locale === "ko" ? "이전 단계" : "Back"}
        </button>
        <button
          type="button"
          className="wf-btn primary"
          onClick={advance}
          disabled={!next || !canAdvance}
        >
          {next
            ? locale === "ko"
              ? `${next.ko} →`
              : `${next.en} →`
            : locale === "ko"
            ? "완료"
            : "Done"}
        </button>
      </div>
    </div>
  );
}
