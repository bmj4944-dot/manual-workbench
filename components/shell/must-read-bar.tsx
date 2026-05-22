"use client";

import { useWorkbench } from "@/lib/workbench-context";

/**
 * Must-read acknowledgement bar. Renders at the bottom of the doc when
 * the active document is on the must-read list. Uses the design system's
 * `.ack-bar` class (manual2 parity) — orange "to-do" state until the
 * user clicks 확인했습니다, then flips to green "done" state.
 */
export function MustReadBar({ nodeId }: { nodeId: string }) {
  const { acked, ack, mustRead } = useWorkbench();
  const required = mustRead.has(nodeId);
  if (!required) return null;
  const done = acked.has(nodeId);

  return (
    <div className={`ack-bar${done ? " done" : ""}`} role="status">
      <div className="ico" aria-hidden="true">
        {done ? <IcCheck /> : <IcShield />}
      </div>
      <div className="body">
        {done ? (
          <>
            <div className="ti">확인 완료</div>
            <div className="ms">
              이 항목은 필독으로 지정되어 있으며 본인이 이미 확인했습니다.
            </div>
          </>
        ) : (
          <>
            <div className="ti">필독 항목입니다</div>
            <div className="ms">
              끝까지 읽으신 뒤 확인해주세요. 관리 대시보드에서 미확인
              멤버에게 알림이 발송될 수 있습니다.
            </div>
          </>
        )}
      </div>
      <button
        type="button"
        onClick={() => ack(nodeId)}
        disabled={done}
      >
        {done ? "확인 완료" : "확인했습니다"}
      </button>
    </div>
  );
}

function IcCheck() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 8.5 6.5 12 13 5" />
    </svg>
  );
}

function IcShield() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 1.5 3 3.5v4.5c0 3 2.2 5.4 5 6.5 2.8-1.1 5-3.5 5-6.5V3.5L8 1.5z" />
      <line x1="8" y1="6" x2="8" y2="9" />
      <circle cx="8" cy="11" r="0.7" fill="currentColor" />
    </svg>
  );
}
