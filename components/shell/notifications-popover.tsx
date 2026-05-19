"use client";

import { Bell, CheckCheck } from "lucide-react";
import { useState } from "react";
import { WHATS_NEW } from "@/lib/sample-data";
import { useWorkbench } from "@/lib/workbench-context";
import { cn } from "@/lib/utils";

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const { whatsNewRead, markWhatsNewRead, markAllWhatsNewRead, setActiveId } =
    useWorkbench();
  const unread = WHATS_NEW.filter((w) => !whatsNewRead.has(w.id)).length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="grid h-8 w-8 place-items-center rounded-[7px] border border-line bg-panel text-ink-2 hover:bg-surface-2 hover:text-ink"
        aria-label="Notifications"
      >
        <Bell size={15} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-accent px-1 font-mono text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
            aria-label="close"
          />
          <div className="absolute right-0 top-10 z-20 w-[340px] rounded-[var(--radius-lg)] border border-line bg-panel shadow-md">
            <div className="flex items-center justify-between border-b border-line px-3.5 py-2.5">
              <span className="text-[13px] font-semibold text-ink">
                What&apos;s new
              </span>
              <button
                type="button"
                onClick={markAllWhatsNewRead}
                className="flex items-center gap-1 rounded-md text-[11px] text-ink-3 hover:text-ink"
              >
                <CheckCheck size={11} /> 모두 읽음
              </button>
            </div>
            <ul className="max-h-[400px] overflow-y-auto py-1">
              {WHATS_NEW.map((w) => {
                const unread = !whatsNewRead.has(w.id);
                return (
                  <li key={w.id}>
                    <button
                      type="button"
                      onClick={() => {
                        markWhatsNewRead(w.id);
                        setActiveId(w.id);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-start gap-2 px-3.5 py-2.5 text-left hover:bg-surface-2",
                        unread && "bg-accent-soft/40",
                      )}
                    >
                      {unread && (
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                      )}
                      {!unread && <span className="mt-1.5 h-1.5 w-1.5 shrink-0" />}
                      <div className="min-w-0 flex-1">
                        <div
                          className={cn(
                            "truncate text-[12.5px]",
                            unread
                              ? "font-medium text-ink"
                              : "text-ink-2",
                          )}
                        >
                          {w.what}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-3">
                          <span>{w.who}</span>
                          <span>·</span>
                          <span>{w.when}</span>
                          {w.isNew && (
                            <span className="ml-1 rounded bg-accent-softer px-1 font-en text-[9.5px] font-bold text-accent">
                              NEW
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
