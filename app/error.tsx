"use client";

import { useEffect } from "react";

/**
 * Page-level error boundary. Rendered by Next.js when something in the
 * rendered tree (below layout.tsx) throws. The data-fetching try/catch in
 * layout.tsx already handles Supabase outages gracefully, so this surface
 * is for genuinely unexpected client/server errors during render.
 *
 * The `reset` function re-renders the segment — usually enough to recover
 * from transient issues (network blip, lost session). Persistent errors
 * keep showing this until the user reloads or clicks the link out.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to whatever sink is wired up (Vercel/Sentry/etc.) so this isn't
    // invisible. The user already sees the fallback UI, so no toast here.
    console.error("[error.tsx] caught render error:", error);
  }, [error]);

  return (
    <div className="err-boundary">
      <div className="eb-card">
        <div className="eb-icon" aria-hidden="true">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <h2 className="eb-title">문제가 발생했습니다</h2>
        <p className="eb-msg">
          예상하지 못한 오류로 화면을 표시할 수 없습니다.
          <br />
          다시 시도하거나 페이지를 새로고침해주세요.
        </p>
        {error.digest && (
          <div className="eb-digest">
            <span className="eb-digest-label">에러 ID</span>
            <code>{error.digest}</code>
          </div>
        )}
        <div className="eb-actions">
          <button type="button" className="eb-btn primary" onClick={reset}>
            다시 시도
          </button>
          <button
            type="button"
            className="eb-btn"
            onClick={() => window.location.reload()}
          >
            페이지 새로고침
          </button>
        </div>
      </div>
    </div>
  );
}
