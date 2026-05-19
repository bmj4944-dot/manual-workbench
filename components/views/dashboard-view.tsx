"use client";

import { useMemo, useState } from "react";
import { Bell, Check, ShieldAlert } from "lucide-react";
import {
  COMPLIANCE_RECORDS,
  MUST_READ_IDS,
  PAGE_STATS,
  TEAM_MEMBERS,
  VERIFICATION,
  verifyStatus,
} from "@/lib/sample-data";
import { findNode, useWorkbench } from "@/lib/workbench-context";
import type { VerifyState } from "@/lib/types";
import { cn } from "@/lib/utils";

type Tab = "compliance" | "analytics" | "verify";

export function DashboardView() {
  const [tab, setTab] = useState<Tab>("compliance");
  return (
    <main className="min-h-0 overflow-y-auto bg-surface">
      <div className="mx-auto max-w-[1080px] px-10 py-8">
        <h1 className="mb-1 text-[22px] font-bold tracking-tighter2 text-ink">
          관리 대시보드
        </h1>
        <p className="mb-5 text-[13px] text-ink-3">
          필독 진행률·콘텐츠 사용 분석·정기 검증 큐를 한눈에 확인합니다.
        </p>

        <div className="mb-5 flex gap-0.5 rounded-[var(--radius)] border border-line bg-surface-2 p-0.5">
          {([
            ["compliance", "필독 확인"],
            ["analytics", "사용 분석"],
            ["verify", "정기 검증"],
          ] as const).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={cn(
                "rounded-[5px] px-3 py-1.5 text-[12.5px] font-medium",
                tab === k
                  ? "bg-panel text-ink shadow-sm"
                  : "text-ink-3 hover:text-ink",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "compliance" && <CompliancePane />}
        {tab === "analytics" && <AnalyticsPane />}
        {tab === "verify" && <VerifyPane />}
      </div>
    </main>
  );
}

function Kpi({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "ok" | "warn" | "muted";
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-line bg-panel p-4">
      <div className="mb-2 text-[11px] font-en font-bold uppercase tracking-[0.08em] text-ink-3">
        {label}
      </div>
      <div
        className={cn(
          "font-en text-[26px] font-bold leading-none tracking-tighter1",
          tone === "ok" && "text-ok",
          tone === "warn" && "text-warn",
          tone === "muted" && "text-ink-3",
          !tone && "text-ink",
        )}
      >
        {value}
      </div>
      {hint && <div className="mt-1.5 text-[11.5px] text-ink-3">{hint}</div>}
    </div>
  );
}

function CompliancePane() {
  const { tree } = useWorkbench();
  const ids = useMemo(() => Array.from(MUST_READ_IDS), []);
  const totalCells = ids.length * TEAM_MEMBERS.length;
  let ack = 0;
  for (const m of TEAM_MEMBERS) {
    for (const id of ids) {
      if (COMPLIANCE_RECORDS[m.id]?.has(id)) ack += 1;
    }
  }
  const rate = totalCells === 0 ? 0 : Math.round((ack / totalCells) * 100);
  const pendingMembers = TEAM_MEMBERS.filter((m) => {
    const recs = COMPLIANCE_RECORDS[m.id];
    return ids.some((id) => !(recs?.has(id) ?? false));
  });

  return (
    <>
      <div className="mb-5 grid grid-cols-4 gap-3">
        <Kpi label="필독 항목" value={`${ids.length}`} hint="현재 지정된 항목 수" />
        <Kpi label="대상 멤버" value={`${TEAM_MEMBERS.length}`} />
        <Kpi
          label="진행률"
          value={`${rate}%`}
          tone={rate > 80 ? "ok" : "warn"}
          hint={`${ack}/${totalCells} 확인`}
        />
        <Kpi
          label="미확인 멤버"
          value={`${pendingMembers.length}`}
          tone={pendingMembers.length === 0 ? "ok" : "warn"}
        />
      </div>

      <section className="mb-5 overflow-x-auto rounded-[var(--radius-lg)] border border-line bg-panel">
        <table className="w-full border-collapse text-[12.5px]">
          <thead className="bg-surface-2 text-ink-2">
            <tr>
              <th className="sticky left-0 z-10 border-b border-line bg-surface-2 px-3 py-2 text-left font-medium">
                항목
              </th>
              {TEAM_MEMBERS.map((m) => (
                <th
                  key={m.id}
                  className="border-b border-line px-3 py-2 text-center font-medium"
                  title={m.name}
                >
                  <span
                    className="inline-grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold text-white"
                    style={{ background: m.color }}
                  >
                    {m.initials}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ids.map((id) => {
              const node = findNode(tree, id);
              return (
                <tr key={id} className="hover:bg-surface-2">
                  <td className="sticky left-0 bg-panel px-3 py-1.5 text-ink-2">
                    {node?.label ?? id}
                  </td>
                  {TEAM_MEMBERS.map((m) => {
                    const done = COMPLIANCE_RECORDS[m.id]?.has(id);
                    return (
                      <td
                        key={m.id}
                        className="px-3 py-1.5 text-center"
                      >
                        {done ? (
                          <Check size={13} className="mx-auto text-ok" />
                        ) : (
                          <span className="text-ink-4">·</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="rounded-[var(--radius-lg)] border border-line bg-panel p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[13px] font-semibold text-ink">멤버별 진행률</h3>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-md bg-accent px-2.5 py-1 text-[12px] font-medium text-white hover:opacity-90"
          >
            <Bell size={12} /> 미확인 멤버에게 알림 발송
          </button>
        </div>
        <ul className="flex flex-col gap-2">
          {TEAM_MEMBERS.map((m) => {
            const recs = COMPLIANCE_RECORDS[m.id];
            const doneCount = ids.filter((id) => recs?.has(id) ?? false).length;
            const pct = Math.round((doneCount / ids.length) * 100);
            return (
              <li key={m.id} className="flex items-center gap-3">
                <span
                  className="grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold text-white"
                  style={{ background: m.color }}
                >
                  {m.initials}
                </span>
                <span className="w-20 text-[12.5px] text-ink-2">{m.name}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className={cn(
                      "h-full",
                      pct === 100 ? "bg-ok" : "bg-accent",
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-14 text-right font-mono text-[11.5px] text-ink-3">
                  {doneCount}/{ids.length}
                </span>
                <span className="w-10 text-right font-mono text-[12px] text-ink">
                  {pct}%
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}

function AnalyticsPane() {
  const { tree } = useWorkbench();
  const entries = Object.entries(PAGE_STATS);
  const totalViews = entries.reduce((s, [, v]) => s + v.views, 0);
  const totalCopies = entries.reduce((s, [, v]) => s + v.copies, 0);
  const avgHelpful =
    entries.reduce((s, [, v]) => s + v.helpful, 0) / Math.max(entries.length, 1);
  const hourly = PAGE_STATS["ch1-2-1"]?.hourly ?? [];
  const maxHourly = Math.max(1, ...hourly);

  const topViews = [...entries]
    .sort(([, a], [, b]) => b.views - a.views)
    .slice(0, 5);
  const topCopies = [...entries]
    .sort(([, a], [, b]) => b.copies - a.copies)
    .slice(0, 5);
  const lowHelpful = [...entries]
    .filter(([, v]) => v.helpful < 0.85)
    .sort(([, a], [, b]) => a.helpful - b.helpful)
    .slice(0, 5);

  return (
    <>
      <div className="mb-5 grid grid-cols-4 gap-3">
        <Kpi label="총 조회수 (7일)" value={totalViews.toLocaleString()} />
        <Kpi label="복사 횟수" value={totalCopies.toLocaleString()} />
        <Kpi
          label="평균 도움도"
          value={`${Math.round(avgHelpful * 100)}%`}
          tone="ok"
        />
        <Kpi label="활성 항목" value={`${entries.length}`} hint="조회 기록이 있는 항목" />
      </div>

      <section className="mb-5 rounded-[var(--radius-lg)] border border-line bg-panel p-4">
        <h3 className="mb-3 text-[13px] font-semibold text-ink">
          24시간 조회 추이 — 전화 응대 스크립트
        </h3>
        <div className="flex h-32 items-end gap-1">
          {hourly.map((v, i) => (
            <div
              key={i}
              className="flex flex-1 flex-col items-center gap-1"
              title={`${i}시 — ${v}회`}
            >
              <div
                className="w-full rounded-t bg-accent"
                style={{
                  height: `${(v / maxHourly) * 100}%`,
                  opacity: 0.35 + (v / maxHourly) * 0.65,
                }}
              />
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between font-mono text-[10px] text-ink-3">
          <span>0시</span>
          <span>6시</span>
          <span>12시</span>
          <span>18시</span>
          <span>23시</span>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <RankCard title="조회수 TOP 5">
          {topViews.map(([id, s]) => (
            <RankRow
              key={id}
              label={findNode(tree, id)?.label ?? id}
              value={s.views.toLocaleString()}
            />
          ))}
        </RankCard>
        <RankCard title="복사 TOP 5">
          {topCopies.map(([id, s]) => (
            <RankRow
              key={id}
              label={findNode(tree, id)?.label ?? id}
              value={s.copies.toLocaleString()}
            />
          ))}
        </RankCard>
        <RankCard title="도움도 낮은 항목 (<85%)">
          {lowHelpful.length === 0 ? (
            <li className="px-3 py-2 text-[12px] text-ink-3">없음</li>
          ) : (
            lowHelpful.map(([id, s]) => (
              <RankRow
                key={id}
                label={findNode(tree, id)?.label ?? id}
                value={`${Math.round(s.helpful * 100)}%`}
                tone="warn"
              />
            ))
          )}
        </RankCard>
        <RankCard title="검색 많은데 작성 미흡">
          {entries
            .filter(([, s]) => s.searches > 80 && s.helpful < 0.9)
            .map(([id, s]) => (
              <RankRow
                key={id}
                label={findNode(tree, id)?.label ?? id}
                value={`${s.searches} 회`}
                tone="warn"
              />
            ))}
        </RankCard>
      </div>
    </>
  );
}

function RankCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-line bg-panel">
      <h3 className="border-b border-line px-3 py-2 text-[12.5px] font-semibold text-ink">
        {title}
      </h3>
      <ol className="flex flex-col">{children}</ol>
    </section>
  );
}

function RankRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "warn";
}) {
  return (
    <li className="flex items-center gap-2 border-b border-line/60 px-3 py-1.5 text-[12.5px] last:border-0">
      <span className="flex-1 truncate text-ink-2">{label}</span>
      <span
        className={cn(
          "font-mono font-medium",
          tone === "warn" ? "text-warn" : "text-ink",
        )}
      >
        {value}
      </span>
    </li>
  );
}

function VerifyPane() {
  const { tree } = useWorkbench();
  const entries = Object.entries(VERIFICATION).map(([id, v]) => {
    const ratio = v.lastVerified / v.intervalDays;
    return {
      id,
      v,
      ratio,
      state: (verifyStatus(id) ?? "fresh") as VerifyState,
    };
  });
  const stale = entries.filter((e) => e.state === "stale").length;
  const aging = entries.filter((e) => e.state === "aging").length;
  const fresh = entries.filter((e) => e.state === "fresh").length;

  return (
    <>
      <div className="mb-5 grid grid-cols-4 gap-3">
        <Kpi label="총 항목" value={`${entries.length}`} />
        <Kpi label="검증 완료" value={`${fresh}`} tone="ok" />
        <Kpi label="만료 임박" value={`${aging}`} tone="warn" />
        <Kpi
          label="재검증 필요"
          value={`${stale}`}
          tone={stale > 0 ? "warn" : "ok"}
        />
      </div>

      <section className="rounded-[var(--radius-lg)] border border-line bg-panel">
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <h3 className="text-[13px] font-semibold text-ink">재검증 대기열</h3>
          <span className="font-mono text-[11.5px] text-ink-3">
            {entries.length}건
          </span>
        </header>
        <ul className="flex flex-col">
          {entries
            .sort((a, b) => b.ratio - a.ratio)
            .map((e) => {
              const node = findNode(tree, e.id);
              const pct = Math.min(120, Math.round(e.ratio * 100));
              return (
                <li
                  key={e.id}
                  className="grid grid-cols-[1fr_120px_120px_100px] items-center gap-3 border-b border-line/60 px-4 py-2.5 text-[12.5px] last:border-0"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium text-ink">
                      {node?.label ?? e.id}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-3">
                      <ShieldAlert size={10} />
                      마지막 검증 {e.v.lastVerified}일 전 · 주기{" "}
                      {e.v.intervalDays}일 · 담당 {e.v.by}
                    </div>
                  </div>
                  <div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className={cn(
                          "h-full",
                          e.state === "stale" && "bg-warn",
                          e.state === "aging" &&
                            "bg-[oklch(0.70_0.14_75)]",
                          e.state === "fresh" && "bg-ok",
                        )}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                    <div className="mt-0.5 font-mono text-[10.5px] text-ink-3">
                      {pct}%
                    </div>
                  </div>
                  <StatePill state={e.state} />
                  <button
                    type="button"
                    disabled={e.state === "fresh"}
                    className={cn(
                      "rounded-md border border-line bg-surface-2 px-2.5 py-1 text-[11.5px] text-ink-2 hover:bg-surface-3",
                      e.state === "fresh" && "cursor-not-allowed opacity-50",
                    )}
                  >
                    검증 시작
                  </button>
                </li>
              );
            })}
        </ul>
      </section>
    </>
  );
}

function StatePill({ state }: { state: VerifyState }) {
  const map: Record<VerifyState, { label: string; cls: string }> = {
    fresh: { label: "검증됨", cls: "bg-ok/15 text-ok border-ok/30" },
    aging: { label: "만료 임박", cls: "bg-warn/15 text-warn border-warn/40" },
    stale: {
      label: "재검증 필요",
      cls: "bg-[oklch(0.95_0.06_28_/_0.4)] text-[oklch(0.45_0.18_28)] border-[oklch(0.80_0.18_28_/_0.4)] animate-pulse",
    },
  };
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-center text-[11px] font-medium",
        map[state].cls,
      )}
    >
      {map[state].label}
    </span>
  );
}
