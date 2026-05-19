"use client";

import { Pin, PinOff, Settings2, X } from "lucide-react";
import { useState } from "react";
import { findNode, useWorkbench } from "@/lib/workbench-context";
import { cn } from "@/lib/utils";

export function DocTabs() {
  const {
    tree,
    activeId,
    openTabs,
    maxTabs,
    setMaxTabs,
    setActiveId,
    closeTab,
    closeOtherTabs,
    togglePin,
    locale,
  } = useWorkbench();
  const [manageOpen, setManageOpen] = useState(false);

  return (
    <div className="flex h-9 items-center gap-1 border-b border-line bg-surface-2 px-2">
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        {openTabs.map((tab) => {
          const node = findNode(tree, tab.id);
          if (!node) return null;
          const label = locale === "ko" ? node.label : node.labelEn ?? node.label;
          const isActive = tab.id === activeId;
          return (
            <div
              key={tab.id}
              role="button"
              tabIndex={0}
              onClick={() => setActiveId(tab.id)}
              onMouseDown={(e) => {
                if (e.button === 1) {
                  e.preventDefault();
                  if (!tab.pinned) closeTab(tab.id);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") setActiveId(tab.id);
              }}
              className={cn(
                "group flex max-w-[200px] shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-[12.5px] text-ink-2 hover:bg-surface-3",
                isActive && "bg-panel text-ink shadow-sm",
              )}
            >
              {tab.pinned && <Pin size={10} className="text-accent" />}
              <span className="truncate">{label}</span>
              {tab.dirty && (
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-warn"
                  title="저장되지 않은 변경"
                />
              )}
              {node.hasComments ? (
                <span className="font-mono text-[10.5px] text-ink-3">
                  {node.hasComments}
                </span>
              ) : null}
              <button
                type="button"
                aria-label="close tab"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                className={cn(
                  "ml-1 grid h-4 w-4 place-items-center rounded text-ink-3 opacity-0 hover:bg-surface-2 hover:text-ink group-hover:opacity-100",
                  isActive && "opacity-100",
                )}
              >
                <X size={10} />
              </button>
            </div>
          );
        })}
      </div>

      <span className="font-mono text-[11px] text-ink-3">
        {openTabs.length}/{maxTabs}
      </span>

      <div className="relative">
        <button
          type="button"
          onClick={() => setManageOpen((v) => !v)}
          className="grid h-7 w-7 place-items-center rounded-md border border-line bg-panel text-ink-3 hover:bg-surface-3 hover:text-ink"
          aria-label="탭 관리"
        >
          <Settings2 size={13} />
        </button>
        {manageOpen && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-10 cursor-default"
              onClick={() => setManageOpen(false)}
              aria-label="close"
            />
            <div className="absolute right-0 top-9 z-20 w-[260px] rounded-[var(--radius)] border border-line bg-panel p-3 shadow-md">
              <div className="mb-2 text-[12px] font-semibold text-ink">
                탭 관리
              </div>
              <label className="mb-1 flex justify-between text-[11.5px] text-ink-3">
                <span>최대 탭 수</span>
                <span className="font-mono text-ink">{maxTabs}</span>
              </label>
              <input
                type="range"
                min={3}
                max={16}
                value={maxTabs}
                onChange={(e) => setMaxTabs(Number(e.target.value))}
                className="w-full accent-[var(--accent)]"
              />
              <div className="mt-3 flex flex-col gap-1">
                <button
                  type="button"
                  className="rounded-md border border-line bg-surface-2 px-2 py-1 text-left text-[12px] text-ink-2 hover:bg-surface-3"
                  onClick={() => {
                    togglePin(activeId);
                  }}
                >
                  {openTabs.find((t) => t.id === activeId)?.pinned ? (
                    <span className="flex items-center gap-1.5">
                      <PinOff size={12} /> 현재 탭 고정 해제
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Pin size={12} /> 현재 탭 고정
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  className="rounded-md border border-line bg-surface-2 px-2 py-1 text-left text-[12px] text-ink-2 hover:bg-surface-3"
                  onClick={() => {
                    closeOtherTabs(activeId);
                    setManageOpen(false);
                  }}
                >
                  다른 탭 모두 닫기
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
