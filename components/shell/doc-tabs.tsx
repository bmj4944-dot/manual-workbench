"use client";

import { FileText, Pin, PinOff, Plus, Settings2, X } from "lucide-react";
import { useState } from "react";
import { findNode, useWorkbench } from "@/lib/workbench-context";
import { cn } from "@/lib/utils";

const STATUS_DOT: Record<string, string> = {
  draft: "var(--ink-4)",
  review: "var(--warn)",
  approved: "oklch(0.55 0.13 240)",
  published: "var(--ok)",
};

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
    <div className="doctabs">
      {openTabs.map((tab) => {
        const node = findNode(tree, tab.id);
        if (!node) return null;
        const label = locale === "ko" ? node.label : node.labelEn ?? node.label;
        const isActive = tab.id === activeId;
        const status = node.status ?? "draft";
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
            className={cn("dt", isActive && "on")}
          >
            <FileText size={11} className="ico" />
            <span
              className="status-dot"
              style={{ background: STATUS_DOT[status] ?? "var(--ink-4)" }}
              title={status}
            />
            {tab.pinned && <Pin size={11} className="pin" />}
            <span className="lbl">{label}</span>
            {tab.dirty && <span className="dirty" title="저장되지 않은 변경" />}
            <button
              type="button"
              className="x"
              aria-label="close tab"
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
            >
              <X size={10} />
            </button>
          </div>
        );
      })}

      <button
        type="button"
        className="dt-add"
        aria-label="새 탭"
        title="새 탭"
        onClick={() => {
          /* placeholder — could open command palette */
        }}
      >
        <Plus size={14} />
      </button>

      <div className="dt-stat" style={{ position: "relative" }}>
        <span>
          {openTabs.length}/{maxTabs}
        </span>
        <button
          type="button"
          onClick={() => setManageOpen((v) => !v)}
          className={cn("max-pill", openTabs.length >= maxTabs && "warn")}
        >
          <Settings2 size={11} style={{ display: "inline", marginRight: 4 }} />
          탭 관리
        </button>
        {manageOpen && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-10 cursor-default"
              onClick={() => setManageOpen(false)}
              aria-label="close"
              style={{ background: "transparent", border: 0 }}
            />
            <div className="tab-mgr">
              <h4>탭 관리</h4>
              <div className="row">
                <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
                  현재 / 최대
                </span>
                <span className="num">
                  {openTabs.length} / {maxTabs}
                </span>
              </div>
              <input
                type="range"
                min={3}
                max={16}
                value={maxTabs}
                onChange={(e) => setMaxTabs(Number(e.target.value))}
                style={{ width: "100%" }}
              />
              <div className="actions">
                <button
                  type="button"
                  onClick={() => togglePin(activeId)}
                >
                  {openTabs.find((t) => t.id === activeId)?.pinned ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <PinOff size={11} /> 고정 해제
                    </span>
                  ) : (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <Pin size={11} /> 현재 탭 고정
                    </span>
                  )}
                </button>
                <button
                  type="button"
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
