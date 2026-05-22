"use client";

import { useEffect } from "react";

/**
 * Root-level error boundary. Active when the failure happens inside
 * `app/layout.tsx` itself (or its data fetches re-throw) — at that point
 * the normal app shell is unavailable, so this component MUST render its
 * own <html>/<body>. No globals.css class names — those styles never got
 * loaded if layout.tsx didn't render. Keep it self-contained.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error.tsx] caught root error:", error);
  }, [error]);

  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily:
            "'Pretendard', -apple-system, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif",
          background: "#faf9f6",
          color: "#1f1d1a",
        }}
      >
        <main
          style={{
            maxWidth: 420,
            width: "calc(100% - 32px)",
            padding: 32,
            border: "1px solid #e7e3da",
            background: "#fff",
            borderRadius: 12,
            boxShadow: "0 6px 24px -8px rgba(50, 40, 20, 0.12)",
            textAlign: "center",
          }}
        >
          <div style={{ color: "#b04a2c", marginBottom: 12 }}>
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ display: "inline-block" }}
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="13" />
              <line x1="12" y1="16.5" x2="12.01" y2="16.5" />
            </svg>
          </div>
          <h2 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700 }}>
            앱을 불러올 수 없습니다
          </h2>
          <p
            style={{
              margin: "0 0 20px",
              fontSize: 13,
              lineHeight: 1.55,
              color: "#5a564e",
            }}
          >
            서비스 초기화 단계에서 오류가 발생했습니다.
            <br />
            잠시 후 다시 시도해주세요.
          </p>
          {error.digest && (
            <div
              style={{
                fontSize: 11,
                color: "#857f74",
                marginBottom: 20,
                fontFamily: "ui-monospace, 'SF Mono', monospace",
              }}
            >
              에러 ID:&nbsp;
              <code style={{ color: "#1f1d1a" }}>{error.digest}</code>
            </div>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "9px 18px",
              border: 0,
              borderRadius: 8,
              background: "#a85a30",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            다시 시도
          </button>
        </main>
      </body>
    </html>
  );
}
