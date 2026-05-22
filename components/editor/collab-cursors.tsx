"use client";

import { useEffect, useRef, useState } from "react";
import { useWorkbench } from "@/lib/workbench-context";

/**
 * Simulated remote collaborator cursors floating over the document body.
 * No backend — picks 2 other team members and bounces their cursors around
 * fake positions every few seconds. Renders nothing in read mode or when
 * the user is alone in members[].
 */
export function CollabCursors() {
  const { members, currentUser, mode } = useWorkbench();
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [tick, setTick] = useState(0);

  // Pick up to 2 "remote" collaborators (not the current user). Stable
  // selection — reshuffles only when the member list changes, not on every
  // tick.
  const remotes = members
    .filter((m) => m.id !== currentUser?.id)
    .slice(0, 2);

  // Measure parent (positioned ancestor — .doc-body in the editor) so cursor
  // positions stay inside the visible area.
  useEffect(() => {
    const el = containerRef.current?.parentElement;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Drive periodic re-positioning. 4s + jitter so cursors don't move in
  // lockstep, which looks robotic.
  useEffect(() => {
    if (mode !== "edit" || remotes.length === 0) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 4000);
    return () => window.clearInterval(id);
  }, [mode, remotes.length]);

  if (mode !== "edit" || remotes.length === 0 || !size) {
    return <div ref={containerRef} style={{ display: "none" }} />;
  }

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
        zIndex: 5,
      }}
    >
      {remotes.map((m, i) => {
        // Pseudo-random per-tick position from a hash of (id, tick, offset)
        // so consecutive ticks are different but reproducible inside a tick.
        const seed = hashCode(`${m.id}-${tick + i * 17}`);
        const x = Math.abs(seed) % Math.max(1, size.w - 120);
        const y = (Math.abs(seed >> 8) % Math.max(1, size.h - 60)) + 24;
        return (
          <div
            key={m.id}
            style={{
              position: "absolute",
              left: x,
              top: y,
              transition: "transform 1.6s cubic-bezier(0.5, 0.2, 0.2, 1)",
              transform: "translate(0, 0)",
              color: m.color,
            }}
          >
            <svg
              width="14"
              height="18"
              viewBox="0 0 14 18"
              style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.25))" }}
            >
              <path
                d="M2 1.6 L12 8.3 L7.2 9.6 L4.8 14.8 Z"
                fill="currentColor"
                stroke="white"
                strokeWidth="0.8"
                strokeLinejoin="round"
              />
            </svg>
            <span
              style={{
                position: "absolute",
                left: 14,
                top: 14,
                whiteSpace: "nowrap",
                background: m.color,
                color: "#fff",
                fontSize: 10,
                fontWeight: 600,
                padding: "2px 6px",
                borderRadius: 4,
                boxShadow: "0 1px 2px rgba(0,0,0,0.18)",
              }}
            >
              {m.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Tiny string hash so positions feel stable per (id, tick) pair without
// pulling in a real RNG.
function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return h;
}
