"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import type { TeamMember } from "@/lib/types";
import { cn } from "@/lib/utils";

export type MentionListRef = {
  onKeyDown: (e: { event: KeyboardEvent }) => boolean;
};

type Props = {
  items: TeamMember[];
  command: (item: { id: string; label: string }) => void;
};

export const MentionList = forwardRef<MentionListRef, Props>(function MentionList(
  { items, command },
  ref,
) {
  const [idx, setIdx] = useState(0);
  useEffect(() => setIdx(0), [items]);

  const pick = (i: number) => {
    const m = items[i];
    if (m) command({ id: m.id, label: m.name });
  };

  useImperativeHandle(ref, () => ({
    onKeyDown({ event }) {
      if (event.key === "ArrowUp") {
        setIdx((i) => (i + items.length - 1) % Math.max(items.length, 1));
        return true;
      }
      if (event.key === "ArrowDown") {
        setIdx((i) => (i + 1) % Math.max(items.length, 1));
        return true;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        pick(idx);
        return true;
      }
      return false;
    },
  }));

  return (
    <div className="min-w-[180px] overflow-hidden rounded-md border border-line bg-panel py-1 shadow-md">
      {items.length === 0 ? (
        <div className="px-3 py-1.5 text-[12px] text-ink-3">결과 없음</div>
      ) : (
        items.map((it, i) => (
          <button
            key={it.id}
            type="button"
            onClick={() => pick(i)}
            className={cn(
              "flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12.5px]",
              i === idx
                ? "bg-accent-soft text-accent"
                : "text-ink-2 hover:bg-surface-2",
            )}
          >
            <span
              className="grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold text-white"
              style={{ background: it.color }}
            >
              {it.initials}
            </span>
            <span className="flex-1 truncate">{it.name}</span>
            <span className="font-en text-[10px] uppercase text-ink-3">
              {it.role}
            </span>
          </button>
        ))
      )}
    </div>
  );
});
