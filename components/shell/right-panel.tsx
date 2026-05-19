"use client";

import { useState } from "react";
import { Check, RotateCcw, Send, Tag } from "lucide-react";
import { findNode, useWorkbench } from "@/lib/workbench-context";
import { SAMPLE_CONTENT } from "@/lib/sample-data";
import type { Comment, Version } from "@/lib/types";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const TABS = ["outline", "comments", "history"] as const;
type Tab = (typeof TABS)[number];

export function RightPanel() {
  const { tree, activeId, locale, comments, history } = useWorkbench();
  const [tab, setTab] = useState<Tab>("outline");
  const node = findNode(tree, activeId);
  const content = SAMPLE_CONTENT[activeId];
  const list = comments[activeId] ?? [];
  const versions = history[activeId] ?? [];

  const outline = content ? extractHeadings(content.body) : [];
  const tabCount: Record<Tab, number> = {
    outline: outline.length,
    comments: list.filter((c) => !c.resolved).length,
    history: versions.length,
  };

  return (
    <aside className="flex min-h-0 flex-col border-l border-line bg-surface-2">
      <div className="flex border-b border-line px-2">
        {TABS.map((tk) => (
          <button
            key={tk}
            type="button"
            onClick={() => setTab(tk)}
            className={cn(
              "flex items-center gap-1 border-b-2 px-3 py-2.5 text-[12.5px] font-medium",
              tab === tk
                ? "border-accent text-ink"
                : "border-transparent text-ink-3 hover:text-ink",
            )}
          >
            {t(locale, tk)}
            {tabCount[tk] > 0 && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-px font-mono text-[10px]",
                  tab === tk
                    ? "bg-accent-soft text-accent"
                    : "bg-surface-3 text-ink-3",
                )}
              >
                {tabCount[tk]}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {tab === "outline" && (
          <>
            <div className="mb-3 rounded-[var(--radius)] border border-line bg-panel p-3">
              <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-en font-bold uppercase tracking-[0.08em] text-accent">
                ✦ {t(locale, "summary")}
              </div>
              <p className="text-[12.5px] leading-relaxed text-ink-2">
                {node
                  ? `"${locale === "ko" ? node.label : node.labelEn ?? node.label}"의 핵심 요약을 AI로 자동 생성할 수 있습니다.`
                  : ""}
              </p>
              <button
                type="button"
                className="mt-2 rounded-md border border-line bg-surface-2 px-2 py-1 text-[11.5px] text-ink-2 hover:bg-surface-3"
              >
                ✨ 요약 생성
              </button>
            </div>

            <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-3">
              {t(locale, "outline")}
            </h3>
            <ul className="flex flex-col gap-1 text-[12.5px]">
              {outline.length === 0 && (
                <li className="text-ink-3">{t(locale, "selectDoc")}</li>
              )}
              {outline.map((h, i) => (
                <li
                  key={i}
                  className="cursor-default text-ink-2 hover:text-ink"
                  style={{ paddingLeft: (h.level - 2) * 12 }}
                >
                  {h.text}
                </li>
              ))}
            </ul>

            {content && (
              <>
                <h3 className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-3">
                  <Tag size={10} className="mr-1 inline" />
                  {t(locale, "tags")}
                </h3>
                <div className="flex flex-wrap gap-1">
                  {content.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-line bg-panel px-2 py-0.5 text-[11.5px] text-ink-2"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <dl className="mt-5 space-y-1 text-[12px]">
                  <Row label={t(locale, "author")} value={content.author} />
                  <Row label={t(locale, "updated")} value={content.updated} />
                  <Row label={t(locale, "version")} value={content.version} />
                </dl>
              </>
            )}
          </>
        )}

        {tab === "comments" && <CommentsTab nodeId={activeId} list={list} />}

        {tab === "history" && <HistoryTab nodeId={activeId} versions={versions} />}
      </div>
    </aside>
  );
}

function CommentsTab({ nodeId, list }: { nodeId: string; list: Comment[] }) {
  const { addComment, resolveComment } = useWorkbench();
  const [draft, setDraft] = useState("");
  const [showResolved, setShowResolved] = useState(false);
  const visible = showResolved ? list : list.filter((c) => !c.resolved);

  return (
    <>
      <ul className="flex flex-col gap-2.5">
        {visible.map((c) => (
          <li
            key={c.id}
            className={cn(
              "rounded-[var(--radius)] border border-line bg-panel p-3",
              c.resolved && "opacity-60",
            )}
          >
            <div className="mb-1.5 flex items-center gap-2">
              <span
                className="grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold text-white"
                style={{ background: c.color }}
              >
                {c.initials}
              </span>
              <span className="text-[12.5px] font-medium text-ink">{c.who}</span>
              <span className="text-[11px] text-ink-3">{c.when}</span>
              <span className="flex-1" />
              <button
                type="button"
                onClick={() => resolveComment(nodeId, c.id)}
                className={cn(
                  "flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px]",
                  c.resolved
                    ? "bg-ok/15 text-ok"
                    : "border border-line bg-surface-2 text-ink-3 hover:bg-surface-3",
                )}
                title={c.resolved ? "해결됨" : "해결로 표시"}
              >
                <Check size={10} /> {c.resolved ? "해결됨" : "해결"}
              </button>
            </div>
            <p className="text-[12.5px] leading-relaxed text-ink-2">
              <CommentBody body={c.body} />
            </p>
          </li>
        ))}
        {visible.length === 0 && (
          <li className="rounded-[var(--radius)] border border-dashed border-line bg-surface-2 px-3 py-4 text-center text-[12px] text-ink-3">
            아직 댓글이 없습니다.
          </li>
        )}
      </ul>
      <button
        type="button"
        onClick={() => setShowResolved((v) => !v)}
        className="mt-2 text-[11.5px] text-ink-3 hover:text-ink"
      >
        {showResolved ? "해결된 댓글 숨기기" : `해결된 댓글 보기 (${list.filter((c) => c.resolved).length})`}
      </button>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          addComment(nodeId, draft);
          setDraft("");
        }}
        className="mt-3 rounded-[var(--radius)] border border-line bg-panel p-2"
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="댓글 — @이름으로 멤버 멘션"
          rows={3}
          className="w-full resize-none rounded border-0 bg-transparent p-1 text-[12.5px] text-ink outline-none placeholder:text-ink-4"
        />
        <div className="mt-1 flex items-center justify-end gap-1.5">
          <button
            type="submit"
            disabled={!draft.trim()}
            className={cn(
              "flex items-center gap-1 rounded-md bg-accent px-2.5 py-1 text-[11.5px] font-medium text-white hover:opacity-90",
              !draft.trim() && "cursor-not-allowed opacity-50",
            )}
          >
            <Send size={11} /> 게시
          </button>
        </div>
      </form>
    </>
  );
}

function CommentBody({ body }: { body: string }) {
  const parts = body.split(/(@\S+)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("@") ? (
          <span
            key={i}
            className="rounded bg-accent-softer px-1 py-px font-medium text-accent"
          >
            {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

function HistoryTab({ nodeId, versions }: { nodeId: string; versions: Version[] }) {
  const { restoreVersion } = useWorkbench();
  return (
    <ul className="flex flex-col gap-2">
      {versions.length === 0 && (
        <li className="text-[12px] text-ink-3">아직 저장된 버전이 없습니다.</li>
      )}
      {versions.map((v, i) => (
        <li
          key={v.id}
          className="flex items-start gap-2 rounded-[var(--radius)] border border-line bg-panel p-3"
        >
          <span
            className={cn(
              "rounded px-1.5 py-px font-en text-[10.5px] font-bold",
              i === 0
                ? "bg-accent-soft text-accent"
                : "bg-surface-2 text-ink-3",
            )}
          >
            {v.v}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 text-[11.5px] text-ink-3">
              <span className="font-medium text-ink-2">{v.who}</span>
              <span>·</span>
              <span>{v.when}</span>
              {v.tag === "approved" && (
                <span className="ml-1 rounded bg-[oklch(0.93_0.04_240)] px-1 text-[9.5px] font-bold text-[oklch(0.40_0.13_240)]">
                  승인
                </span>
              )}
              {v.tag === "published" && (
                <span className="ml-1 rounded bg-[oklch(0.92_0.06_145)] px-1 text-[9.5px] font-bold text-[oklch(0.38_0.13_145)]">
                  공개
                </span>
              )}
            </div>
            <div className="mt-1 text-[12.5px] text-ink-2">{v.desc}</div>
            {i > 0 && (
              <button
                type="button"
                onClick={() => restoreVersion(nodeId, v.id)}
                disabled={!v.body}
                className={cn(
                  "mt-1.5 flex items-center gap-1 rounded-md border border-line bg-surface-2 px-2 py-0.5 text-[11px] text-ink-2 hover:bg-surface-3",
                  !v.body && "cursor-not-allowed opacity-40",
                )}
                title={!v.body ? "본문 스냅샷 없음" : "이 버전으로 복원"}
              >
                <RotateCcw size={10} /> 복원
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-ink-2">
      <dt className="text-ink-3">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function extractHeadings(html: string): { level: number; text: string }[] {
  const out: { level: number; text: string }[] = [];
  const re = /<h([2-4])[^>]*>(.*?)<\/h\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    out.push({
      level: Number(m[1]),
      text: m[2].replace(/<[^>]+>/g, "").trim(),
    });
  }
  return out;
}
