"use client";

import { useState } from "react";
import { useWorkbench } from "@/lib/workbench-context";

/**
 * Topbar notification bell. Uses the design-system `.notif-btn` + `.notif-pop`
 * classes (manual2 parity) instead of inline Tailwind. The popover shows the
 * What's New feed and marks items read on click. The bell badge counts unread.
 */
export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const {
    whatsNew,
    whatsNewRead,
    markWhatsNewRead,
    markAllWhatsNewRead,
    setActiveId,
  } = useWorkbench();
  const unread = whatsNew.filter((w) => !whatsNewRead.has(w.id)).length;

  return (
    <div className="notif-btn" style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="grid h-8 w-8 place-items-center rounded-[7px] border border-line bg-panel text-ink-2 hover:bg-surface-2 hover:text-ink"
        aria-label="Notifications"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <IcBell />
        {unread > 0 && <span className="badge-dot">{unread}</span>}
      </button>
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
            aria-label="close"
          />
          <div
            className="notif-pop"
            style={{ zIndex: 200 }}
            role="dialog"
            aria-label="알림"
          >
            <div className="nh">
              <h4>What&apos;s new</h4>
              <button
                type="button"
                onClick={markAllWhatsNewRead}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  border: 0,
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 11,
                  color: "var(--ink-3)",
                  padding: 0,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "var(--ink-1)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "var(--ink-3)")
                }
              >
                <IcCheckAll /> 모두 읽음
              </button>
            </div>
            <div className="nb">
              {whatsNew.length === 0 ? (
                <div
                  style={{
                    padding: "28px 14px",
                    textAlign: "center",
                    fontSize: 12,
                    color: "var(--ink-3)",
                  }}
                >
                  새 알림이 없습니다.
                </div>
              ) : (
                whatsNew.map((w) => {
                  const isUnread = !whatsNewRead.has(w.id);
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => {
                        markWhatsNewRead(w.id);
                        setActiveId(w.id);
                        setOpen(false);
                      }}
                      className={`ni${isUnread ? "" : " read"}`}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        border: 0,
                        background: "transparent",
                        font: "inherit",
                      }}
                    >
                      <div className="ic" aria-hidden="true">
                        <IcSpark />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="nm">{w.what}</div>
                        <div
                          className="ns"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            flexWrap: "wrap",
                          }}
                        >
                          <span>{w.who}</span>
                          <span>·</span>
                          <span>{w.when}</span>
                          {w.isNew && (
                            <span
                              style={{
                                fontFamily: "var(--font-en)",
                                fontSize: 9.5,
                                fontWeight: 700,
                                color: "var(--accent)",
                                background: "var(--accent-2)",
                                padding: "1px 5px",
                                borderRadius: 3,
                              }}
                            >
                              NEW
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function IcBell() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 1.8c-2.5 0-4.2 1.9-4.2 4.4 0 3-1.4 4.3-2.1 4.8h12.6c-.7-.5-2.1-1.8-2.1-4.8 0-2.5-1.7-4.4-4.2-4.4z" />
      <path d="M6.3 13c.2.7 1 1.2 1.7 1.2s1.5-.5 1.7-1.2" />
    </svg>
  );
}

function IcCheckAll() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="1.5 7.5 4 10 8.5 5" />
      <polyline points="6.5 9.5 8.5 11.5 12.5 6" />
    </svg>
  );
}

function IcSpark() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 14 14"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M7 1L8 5 12 6 8 7 7 11 6 7 2 6 6 5 Z" />
    </svg>
  );
}
