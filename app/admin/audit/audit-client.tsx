"use client";

import { useMemo, useState } from "react";
import type { AuditLogRow } from "@/lib/data/audit";

function formatTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function AuditClient({ logs }: { logs: AuditLogRow[] }) {
  const [q, setQ] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [okFilter, setOkFilter] = useState<"all" | "ok" | "fail">("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const actions = useMemo(() => {
    const s = new Set<string>();
    for (const l of logs) s.add(l.action);
    return Array.from(s).sort();
  }, [logs]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return logs.filter((l) => {
      if (actionFilter !== "all" && l.action !== actionFilter) return false;
      if (okFilter === "ok" && !l.ok) return false;
      if (okFilter === "fail" && l.ok) return false;
      if (!needle) return true;
      const hay = [
        l.actorName,
        l.action,
        l.targetType,
        l.targetId,
        JSON.stringify(l.metadata),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [logs, q, actionFilter, okFilter]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
          감사 로그 {logs.length}건 (최근 200건)
        </h2>
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="작성자·액션·대상·metadata 전체 검색"
          style={{
            flex: 1,
            minWidth: 280,
            padding: "8px 12px",
            borderRadius: 6,
            border: "1px solid var(--line)",
            background: "var(--panel)",
            color: "var(--ink)",
            fontSize: 13,
            outline: "none",
          }}
        />
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          style={{
            padding: "8px 10px",
            borderRadius: 6,
            border: "1px solid var(--line)",
            background: "var(--panel)",
            color: "var(--ink)",
            fontSize: 12.5,
          }}
        >
          <option value="all">모든 액션</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select
          value={okFilter}
          onChange={(e) => setOkFilter(e.target.value as "all" | "ok" | "fail")}
          style={{
            padding: "8px 10px",
            borderRadius: 6,
            border: "1px solid var(--line)",
            background: "var(--panel)",
            color: "var(--ink)",
            fontSize: 12.5,
          }}
        >
          <option value="all">성공+실패</option>
          <option value="ok">성공만</option>
          <option value="fail">실패만</option>
        </select>
      </div>

      <div
        style={{
          border: "1px solid var(--line)",
          borderRadius: 8,
          overflow: "hidden",
          background: "var(--panel)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "150px 140px 200px minmax(200px, 1fr) 60px",
            gap: 12,
            padding: "10px 16px",
            borderBottom: "1px solid var(--line)",
            background: "var(--surface-2)",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--ink-3)",
            textTransform: "uppercase",
            letterSpacing: 0.4,
          }}
        >
          <div>시각</div>
          <div>액터</div>
          <div>액션</div>
          <div>대상 / 메타</div>
          <div>결과</div>
        </div>

        {filtered.length === 0 ? (
          <div
            style={{
              padding: 32,
              textAlign: "center",
              color: "var(--ink-3)",
              fontSize: 13,
            }}
          >
            기록이 없습니다.
          </div>
        ) : (
          filtered.map((l) => {
            const open = expanded.has(l.id);
            return (
              <div
                key={l.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "150px 140px 200px minmax(200px, 1fr) 60px",
                  gap: 12,
                  padding: "10px 16px",
                  borderBottom: "1px solid var(--line)",
                  alignItems: "start",
                  fontSize: 12,
                  fontFamily: "ui-monospace, SFMono-Regular, monospace",
                  background: l.ok ? "transparent" : "rgba(192, 57, 43, 0.06)",
                  cursor: "pointer",
                }}
                onClick={() => toggle(l.id)}
              >
                <div style={{ color: "var(--ink-2)" }}>
                  {formatTime(l.createdAt)}
                </div>
                <div style={{ color: "var(--ink-2)" }}>
                  {l.actorName ?? "—"}
                </div>
                <div style={{ color: "var(--ink)" }}>{l.action}</div>
                <div style={{ color: "var(--ink-2)", overflow: "hidden" }}>
                  {l.targetType && (
                    <div>
                      <span style={{ color: "var(--ink-3)" }}>{l.targetType}:</span>{" "}
                      <span>{l.targetId ?? "—"}</span>
                    </div>
                  )}
                  {open ? (
                    <pre
                      style={{
                        margin: "4px 0 0",
                        padding: 8,
                        background: "var(--surface)",
                        borderRadius: 4,
                        fontSize: 11,
                        overflow: "auto",
                        maxHeight: 240,
                      }}
                    >
                      {JSON.stringify(l.metadata, null, 2)}
                    </pre>
                  ) : (
                    Object.keys(l.metadata).length > 0 && (
                      <div
                        style={{
                          color: "var(--ink-3)",
                          fontSize: 11,
                          marginTop: 2,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {JSON.stringify(l.metadata)}
                      </div>
                    )
                  )}
                </div>
                <div>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "1px 8px",
                      borderRadius: 4,
                      fontSize: 11,
                      background: l.ok ? "rgba(39, 174, 96, 0.15)" : "rgba(192, 57, 43, 0.15)",
                      color: l.ok ? "#27ae60" : "#c0392b",
                    }}
                  >
                    {l.ok ? "OK" : "FAIL"}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
