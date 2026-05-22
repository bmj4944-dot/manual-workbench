/**
 * Loading fallback that mirrors the real app shell so users see structure
 * (topbar / sidebar / doc area / right panel) rather than a blank page or
 * spinner. Activated by Next.js Suspense during page navigation and when
 * page-level async data is being streamed.
 *
 * Note: data fetching currently happens in `app/layout.tsx`, which blocks
 * the initial SSR. This fallback covers client-side navigation and any
 * future move to page-level fetches.
 */
export default function Loading() {
  return (
    <div className="sk-app" aria-busy="true" aria-label="불러오는 중">
      {/* Topbar */}
      <div className="sk-topbar">
        <div className="sk-circle" style={{ width: 36, height: 36 }} />
        <div className="sk-bar" style={{ width: 120, height: 14 }} />
        <div style={{ flex: 1 }} />
        <div className="sk-bar" style={{ width: 220, height: 28 }} />
        <div className="sk-bar" style={{ width: 88, height: 28 }} />
        <div className="sk-circle" style={{ width: 28, height: 28 }} />
        <div className="sk-circle" style={{ width: 28, height: 28 }} />
      </div>

      {/* 3-panel body */}
      <div className="sk-main">
        {/* Sidebar */}
        <aside className="sk-sidebar">
          <div className="sk-bar" style={{ width: "60%", height: 12 }} />
          <div className="sk-bar" style={{ width: "100%", height: 30 }} />
          <div className="sk-bar" style={{ width: "100%", height: 56 }} />
          <div style={{ height: 8 }} />
          <div className="sk-bar" style={{ width: "40%", height: 11 }} />
          <div className="sk-bar" style={{ width: "90%", height: 22 }} />
          <div className="sk-bar" style={{ width: "85%", height: 22 }} />
          <div className="sk-bar" style={{ width: "92%", height: 22 }} />
          <div className="sk-bar" style={{ width: "70%", height: 22 }} />
          <div className="sk-bar" style={{ width: "82%", height: 22 }} />
        </aside>

        {/* Center: doc tabs + main pane */}
        <main className="sk-center">
          <div className="sk-tabs">
            <div className="sk-bar" style={{ width: 140, height: 26 }} />
            <div className="sk-bar" style={{ width: 110, height: 26 }} />
            <div className="sk-bar" style={{ width: 96, height: 26 }} />
          </div>

          {/* Workflow strip */}
          <div className="sk-wf">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="sk-circle" style={{ width: 22, height: 22 }} />
            ))}
          </div>

          {/* Doc head */}
          <div className="sk-dochead">
            <div className="sk-row">
              <div className="sk-bar" style={{ width: 44, height: 18, borderRadius: 999 }} />
              <div className="sk-bar" style={{ width: 56, height: 18, borderRadius: 999 }} />
              <div className="sk-bar" style={{ width: 70, height: 18, borderRadius: 999 }} />
            </div>
            <div className="sk-bar" style={{ width: "70%", height: 28, marginTop: 12 }} />
            <div className="sk-bar" style={{ width: "40%", height: 12, marginTop: 8 }} />
          </div>

          {/* Body lines */}
          <div className="sk-body">
            <div className="sk-bar" style={{ width: "92%", height: 12 }} />
            <div className="sk-bar" style={{ width: "88%", height: 12 }} />
            <div className="sk-bar" style={{ width: "95%", height: 12 }} />
            <div className="sk-bar" style={{ width: "60%", height: 12 }} />
            <div style={{ height: 12 }} />
            <div className="sk-bar" style={{ width: "40%", height: 18 }} />
            <div className="sk-bar" style={{ width: "90%", height: 12 }} />
            <div className="sk-bar" style={{ width: "85%", height: 12 }} />
            <div className="sk-bar" style={{ width: "75%", height: 12 }} />
          </div>
        </main>

        {/* Right panel */}
        <aside className="sk-rpanel">
          <div className="sk-rp-tabs">
            <div className="sk-bar" style={{ width: 60, height: 22 }} />
            <div className="sk-bar" style={{ width: 60, height: 22 }} />
            <div className="sk-bar" style={{ width: 60, height: 22 }} />
          </div>
          <div className="sk-block" style={{ height: 84 }} />
          <div className="sk-block" style={{ height: 64 }} />
          <div className="sk-bar" style={{ width: "30%", height: 11 }} />
          <div className="sk-bar" style={{ width: "100%", height: 22 }} />
          <div className="sk-bar" style={{ width: "100%", height: 22 }} />
        </aside>
      </div>
    </div>
  );
}
