"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { findNode, useWorkbench } from "@/lib/workbench-context";
import type { Attachment, Case, Comment, Version } from "@/lib/types";

type Tab = "outline" | "comments" | "history";

// ─────────────────────────────────────────────────────────────────
// Inline SVG icons (matches the original handoff exactly)
// ─────────────────────────────────────────────────────────────────
function IcList({ size = 11 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="3" y1="3.5" x2="11" y2="3.5" />
      <line x1="3" y1="7" x2="11" y2="7" />
      <line x1="3" y1="10.5" x2="11" y2="10.5" />
    </svg>
  );
}
function IcMsg({ size = 11 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 8a2 2 0 0 1-2 2H5l-3 3V4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function IcClock({ size = 11 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="7" cy="7" r="5" />
      <polyline points="7 4 7 7 9 8.5" />
    </svg>
  );
}
function IcSparkle({ size = 11 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="currentColor"
    >
      <path d="M7 1L8 5 12 6 8 7 7 11 6 7 2 6 6 5 Z" />
    </svg>
  );
}
function IcDownload({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 9v2.5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V9" />
      <polyline points="4.5 5.5 7 8 9.5 5.5" />
      <line x1="7" y1="8" x2="7" y2="1.5" />
    </svg>
  );
}
function IcClose({ size = 11 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="3.5" y1="3.5" x2="10.5" y2="10.5" />
      <line x1="10.5" y1="3.5" x2="3.5" y2="10.5" />
    </svg>
  );
}
function IcUploadBig({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────
// RightPanel
// ─────────────────────────────────────────────────────────────────
export function RightPanel() {
  const {
    tree,
    activeId,
    locale,
    comments,
    history,
    content: contentMap,
    cases,
    attachments,
    uploadAttachment,
    can,
  } = useWorkbench();
  const [tab, setTab] = useState<Tab>("outline");
  const node = findNode(tree, activeId);
  const content = contentMap[activeId];
  const list = comments[activeId] ?? [];
  const versions = history[activeId] ?? [];
  const nodeAttachments = attachments[activeId] ?? [];
  const relatedCases = useMemo(
    () => cases.filter((c) => c.linkedSection === activeId),
    [cases, activeId],
  );
  const isPdf = content?.type === "pdf";

  // Outline derived from stored body HTML — no live MutationObserver to avoid
  // observer→setState→re-render loop that hung the page previously.
  const outline = useMemo(() => {
    const html = content?.body ?? "";
    const out: { level: number; text: string; id: string }[] = [];
    const re = /<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi;
    let m: RegExpExecArray | null;
    let i = 0;
    while ((m = re.exec(html)) !== null) {
      out.push({
        level: Number(m[1]),
        text: m[2].replace(/<[^>]+>/g, "").trim(),
        id: `oh-${i++}`,
      });
    }
    return out;
  }, [content?.body]);

  const unresolvedCount = list.filter((c) => !c.resolved).length;

  // ─── Page-wide file drag detection ───
  // When user drags files from OS anywhere over the window, show overlay hint
  // in the right panel. Drop is accepted anywhere on the panel itself.
  const [dragOverPage, setDragOverPage] = useState(false);
  const pageDragCounter = useRef(0);
  const canEdit = can("edit");
  useEffect(() => {
    const hasFiles = (e: DragEvent) => !!e.dataTransfer?.types?.includes("Files");
    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      pageDragCounter.current++;
      setDragOverPage(true);
    };
    const onLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      pageDragCounter.current--;
      if (pageDragCounter.current <= 0) {
        setDragOverPage(false);
        pageDragCounter.current = 0;
      }
    };
    const onDropWin = () => {
      pageDragCounter.current = 0;
      setDragOverPage(false);
    };
    const onDragOver = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("drop", onDropWin);
    window.addEventListener("dragover", onDragOver);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("drop", onDropWin);
      window.removeEventListener("dragover", onDragOver);
    };
  }, []);

  const onPanelDrop = async (e: React.DragEvent) => {
    if (!e.dataTransfer?.types?.includes("Files")) return;
    e.preventDefault();
    e.stopPropagation();
    setDragOverPage(false);
    pageDragCounter.current = 0;
    if (!canEdit || !node) return;
    const files = Array.from(e.dataTransfer.files ?? []);
    for (const f of files) {
      try {
        await uploadAttachment(activeId, f);
      } catch (err) {
        console.error("panel drop upload failed", err);
      }
    }
  };
  const onPanelDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer?.types?.includes("Files")) e.preventDefault();
  };

  return (
    <aside
      className="rpanel"
      style={{ position: "relative" }}
      onDragOver={onPanelDragOver}
      onDrop={onPanelDrop}
    >
      {dragOverPage && canEdit && tab === "outline" && (
        <div className="attach-overlay">
          <div style={{ textAlign: "center" }}>
            <div>{locale === "ko" ? "파일을 첨부하려면" : "To attach files"}</div>
            <div className="ms">
              {locale === "ko"
                ? "우측 패널 어디든 놓으세요 ↗"
                : "Drop anywhere on the right panel ↗"}
            </div>
          </div>
        </div>
      )}
      <div className="rp-tabs">
        <button
          type="button"
          className={tab === "outline" ? "on" : ""}
          onClick={() => setTab("outline")}
        >
          <IcList /> {locale === "ko" ? "아웃라인" : "Outline"}
        </button>
        <button
          type="button"
          className={tab === "comments" ? "on" : ""}
          onClick={() => setTab("comments")}
        >
          <IcMsg /> {locale === "ko" ? "댓글" : "Comments"}
          {unresolvedCount > 0 && (
            <span
              style={{
                fontFamily: "var(--font-en)",
                fontSize: 10,
                fontWeight: 600,
                background: "var(--accent)",
                color: "white",
                padding: "0 5px",
                borderRadius: 999,
                minWidth: 14,
                textAlign: "center",
              }}
            >
              {unresolvedCount}
            </span>
          )}
        </button>
        <button
          type="button"
          className={tab === "history" ? "on" : ""}
          onClick={() => setTab("history")}
        >
          <IcClock /> {locale === "ko" ? "히스토리" : "History"}
        </button>
      </div>

      <div className="rp-body">
        {tab === "outline" && (
          <div>
            {node && content?.body && !isPdf && <AISummary nodeId={activeId} />}

            {node && relatedCases.length > 0 && (
              <RelatedCases cases={relatedCases} />
            )}

            {node && (
              <AttachmentsSection
                nodeId={activeId}
                attachments={nodeAttachments}
              />
            )}

            <div className="meta-section">
              <h4>{locale === "ko" ? "태그" : "Tags"}</h4>
              <div className="tags-row">
                {(content?.tags ?? []).map((tg) => (
                  <span key={tg} className="tg">
                    {tg}
                  </span>
                ))}
                <span
                  className="tg"
                  style={{ color: "var(--ink-4)", cursor: "pointer" }}
                >
                  + 추가
                </span>
              </div>
            </div>

            <div className="meta-section">
              <h4>{locale === "ko" ? "아웃라인" : "Outline"}</h4>
              <div className="outline">
                {outline.length === 0 ? (
                  <div style={{ fontSize: 12, color: "var(--ink-3)" }}>—</div>
                ) : (
                  outline.map((o) => (
                    <a
                      key={o.id}
                      className={`o-item l${o.level}`}
                      href={`#${o.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        document.getElementById(o.id)?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        });
                      }}
                    >
                      {o.text}
                    </a>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {tab === "comments" && <CommentsTab nodeId={activeId} list={list} />}
        {tab === "history" && <HistoryTab nodeId={activeId} versions={versions} />}
      </div>
    </aside>
  );
}

// ─── AI Summary (matches assist.jsx — 3 states) ────────────────────
function AISummary({ nodeId }: { nodeId: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );
  const [summary, setSummary] = useState<string>("");
  const [error, setError] = useState<string>("");

  // Reset on node change
  const lastNodeId = useRef(nodeId);
  if (lastNodeId.current !== nodeId) {
    lastNodeId.current = nodeId;
    if (state !== "idle") {
      setState("idle");
      setSummary("");
      setError("");
    }
  }

  const generate = async () => {
    setState("loading");
    setError("");
    // Placeholder: no Claude API on this side yet; show a simulated result.
    setTimeout(() => {
      setSummary(
        "이 문서는 핵심 원칙과 절차를 정리한 가이드입니다. 실무에서 자주 발생하는 상황을 기준으로 권장 응대 방식과 피해야 할 표현을 명시했습니다. 워크플로우 단계에 따라 활용해주세요.",
      );
      setState("done");
    }, 1200);
  };

  return (
    <div className="ai-summary">
      <div className="as-hd">
        <IcSparkle />
        AI 요약
      </div>
      {state === "idle" && (
        <div>
          <div
            style={{
              fontSize: 12.5,
              color: "var(--ink-2)",
              marginBottom: 8,
              lineHeight: 1.5,
            }}
          >
            이 문서의 핵심을 3~4문장으로 요약해드립니다.
          </div>
          <button
            type="button"
            onClick={generate}
            style={{
              padding: "6px 12px",
              background: "oklch(0.55 0.15 290)",
              color: "white",
              border: 0,
              borderRadius: 6,
              font: "inherit",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ✨ 요약 생성
          </button>
        </div>
      )}
      {state === "loading" && (
        <div className="as-loading">
          요약 생성 중
          <span className="dots">
            <span />
            <span />
            <span />
          </span>
        </div>
      )}
      {state === "error" && (
        <div style={{ color: "oklch(0.55 0.18 25)", fontSize: 12.5 }}>
          {error}
        </div>
      )}
      {state === "done" && (
        <>
          <div className="as-body">{summary}</div>
          <div className="as-actions">
            <button onClick={generate}>↻ 다시 생성</button>
            <button
              onClick={() => navigator.clipboard?.writeText(summary)}
            >
              📋 복사
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Related Cases (matches assist.jsx) ──────────────────────────
const RC_LABEL: Record<
  Case["result"],
  { ko: string; color: string; bg: string }
> = {
  good: {
    ko: "우수",
    color: "oklch(0.40 0.13 145)",
    bg: "oklch(0.94 0.07 145)",
  },
  bad: {
    ko: "실패",
    color: "oklch(0.45 0.16 25)",
    bg: "oklch(0.95 0.06 25)",
  },
  mixed: {
    ko: "복합",
    color: "oklch(0.40 0.14 65)",
    bg: "oklch(0.94 0.07 65)",
  },
};

function RelatedCases({ cases }: { cases: Case[] }) {
  const { setView } = useWorkbench();
  return (
    <div className="meta-section related-cases">
      <h4>관련 응대 사례 ({cases.length})</h4>
      {cases.map((c) => {
        const r = RC_LABEL[c.result] ?? RC_LABEL.mixed;
        return (
          <div
            key={c.id}
            className="rc-card"
            onClick={() => setView("cases")}
          >
            <div className="rc-hd">
              <span
                className="res-pill"
                style={{ background: r.bg, color: r.color }}
              >
                {r.ko}
              </span>
              <span className="rc-id">{c.id}</span>
            </div>
            <div className="rc-ti">{c.title}</div>
            <div className="rc-meta">
              {c.agent.name} · {c.date} · {c.duration}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Attachments helpers (matches attachments.jsx) ───────────────
const FILE_KINDS: Record<string, { exts: string[]; label: string }> = {
  pdf: { exts: ["pdf"], label: "PDF" },
  doc: { exts: ["doc", "docx", "rtf", "odt", "hwp", "hwpx"], label: "DOC" },
  xls: { exts: ["xls", "xlsx", "ods"], label: "XLS" },
  ppt: { exts: ["ppt", "pptx", "odp", "key"], label: "PPT" },
  img: {
    exts: ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"],
    label: "IMG",
  },
  zip: { exts: ["zip", "rar", "7z", "tar", "gz"], label: "ZIP" },
  csv: { exts: ["csv", "tsv"], label: "CSV" },
  txt: { exts: ["txt", "md", "log"], label: "TXT" },
};
function kindOf(name: string): string {
  const ext = (name.split(".").pop() ?? "").toLowerCase();
  for (const [k, def] of Object.entries(FILE_KINDS))
    if (def.exts.includes(ext)) return k;
  return "gen";
}
function kindLabel(kind: string): string {
  return FILE_KINDS[kind]?.label ?? "FILE";
}
function formatBytes(b: number): string {
  if (b == null) return "—";
  if (b < 1024) return b + " B";
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + " KB";
  if (b < 1024 * 1024 * 1024) return (b / 1048576).toFixed(1) + " MB";
  return (b / 1073741824).toFixed(2) + " GB";
}
function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

type Uploading = { id: string; name: string; progress: number; kind: string };

function AttachmentsSection({
  nodeId,
  attachments,
}: {
  nodeId: string;
  attachments: Attachment[];
}) {
  const { uploadAttachment, deleteAttachment, can } = useWorkbench();
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);
  const [over, setOver] = useState(false);
  const [uploading, setUploading] = useState<Uploading[]>([]);
  const canEdit = can("edit");

  const handleFiles = useCallback(
    async (files: FileList | File[] | null) => {
      if (!files) return;
      const arr = Array.from(files);
      for (const file of arr) {
        const tempId = `tmp-${Date.now()}-${Math.random()}`;
        const kind = kindOf(file.name);
        setUploading((prev) => [
          ...prev,
          { id: tempId, name: file.name, progress: 5, kind },
        ]);
        const tick = window.setInterval(() => {
          setUploading((prev) =>
            prev.map((u) =>
              u.id === tempId
                ? { ...u, progress: Math.min(90, u.progress + 7) }
                : u,
            ),
          );
        }, 120);
        try {
          await uploadAttachment(nodeId, file);
        } catch (err) {
          console.error("uploadAttachment failed", err);
        } finally {
          window.clearInterval(tick);
          setUploading((prev) => prev.filter((u) => u.id !== tempId));
        }
      }
    },
    [nodeId, uploadAttachment],
  );

  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer?.types?.includes("Files")) setOver(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current <= 0) {
      setOver(false);
      dragCounter.current = 0;
    }
  };
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOver(false);
    dragCounter.current = 0;
    if (canEdit) handleFiles(e.dataTransfer?.files);
  };

  const onDelete = (a: Attachment) => {
    if (!confirm(`'${a.fileName}'을(를) 삭제할까요?`)) return;
    deleteAttachment(nodeId, a.id);
  };

  return (
    <div
      className="meta-section"
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <h4
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span>첨부 파일 ({attachments.length})</span>
        {canEdit && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            title="파일 추가"
            style={{
              border: 0,
              background: "transparent",
              color: "var(--accent)",
              cursor: "pointer",
              font: "inherit",
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: "0.04em",
              padding: 0,
              textTransform: "uppercase",
            }}
          >
            + 추가
          </button>
        )}
      </h4>

      {canEdit && (
        <div
          className={`attach-zone${over ? " over" : ""}`}
          onClick={() => inputRef.current?.click()}
        >
          <IcUploadBig />
          <div className="ti">
            {over ? "여기에 놓으세요" : "파일을 끌어다 놓거나 클릭"}
          </div>
          <div className="ms">PDF · DOC · XLS · IMG · 모든 파일 지원</div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        style={{ display: "none" }}
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {uploading.map((u) => (
        <div key={u.id} className="attachment uploading">
          <div className={`file-ico ${u.kind}`}>{kindLabel(u.kind)}</div>
          <div className="at-body">
            <div className="at-name">{u.name}</div>
            <div className="at-meta">업로드 중... {u.progress}%</div>
            <div className="at-progress">
              <div className="fill" style={{ width: `${u.progress}%` }} />
            </div>
          </div>
        </div>
      ))}

      {attachments.length === 0 && uploading.length === 0 ? (
        <div
          style={{
            fontSize: 11.5,
            color: "var(--ink-4)",
            padding: "4px 2px",
            fontStyle: "italic",
          }}
        >
          아직 첨부된 파일이 없습니다.
        </div>
      ) : (
        attachments.map((a) => {
          const kind = kindOf(a.fileName);
          return (
            <div
              key={a.id}
              className="attachment"
              title={a.fileName}
              onClick={() => window.open(`/api/attachments/${a.id}`, "_blank")}
            >
              <div className={`file-ico ${kind}`}>{kindLabel(kind)}</div>
              <div className="at-body">
                <div className="at-name">{a.fileName}</div>
                <div className="at-meta">
                  {formatBytes(a.fileSize)} · {formatDate(a.uploadedAt)}
                  {a.uploaderName !== "—" ? ` · ${a.uploaderName}` : ""}
                </div>
              </div>
              <div className="at-actions">
                <button
                  type="button"
                  title="다운로드"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(`/api/attachments/${a.id}`, "_blank");
                  }}
                >
                  <IcDownload />
                </button>
                {canEdit && (
                  <button
                    type="button"
                    className="danger"
                    title="삭제"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(a);
                    }}
                  >
                    <IcClose />
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── Comments tab (matches manual2 right-panel.jsx) ─────────────
function CommentsTab({
  nodeId,
  list,
}: {
  nodeId: string;
  list: Comment[];
}) {
  const { addComment, resolveComment } = useWorkbench();
  const [draft, setDraft] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);

  return (
    <div className="comments">
      {list.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "40px 0",
            color: "var(--ink-3)",
          }}
        >
          <IcMsg size={24} />
          <div style={{ marginTop: 8, fontSize: 12 }}>
            아직 댓글이 없습니다.
          </div>
        </div>
      ) : (
        list.map((c) => (
          <div key={c.id} className={`c-item${c.resolved ? " resolved" : ""}`}>
            <div className="c-hd">
              <div className="av" style={{ background: c.color }}>
                {c.initials}
              </div>
              <div className="nm">{c.who}</div>
              <div className="when">{c.when}</div>
            </div>
            <div className="c-body">{c.body}</div>
            <div className="c-actions">
              <button onClick={() => setComposerOpen(true)}>답글</button>
              <button onClick={() => resolveComment(nodeId, c.id)}>
                {c.resolved ? "해결됨 ✓" : "해결"}
              </button>
            </div>
          </div>
        ))
      )}

      {!composerOpen ? (
        <button
          type="button"
          onClick={() => setComposerOpen(true)}
          style={{
            width: "100%",
            padding: "10px 12px",
            background: "transparent",
            border: "1px dashed var(--line-2)",
            borderRadius: 8,
            color: "var(--ink-3)",
            cursor: "pointer",
            font: "inherit",
            fontSize: 12.5,
            marginTop: 8,
          }}
        >
          + 댓글 남기기
        </button>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const trimmed = draft.trim();
            if (!trimmed) return;
            addComment(nodeId, trimmed);
            setDraft("");
            setComposerOpen(false);
          }}
          style={{
            marginTop: 8,
            padding: 10,
            borderRadius: 8,
            background: "var(--panel)",
            border: "1px solid var(--line)",
          }}
        >
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="댓글 — @이름으로 멤버 멘션"
            rows={3}
            style={{
              width: "100%",
              border: 0,
              background: "transparent",
              outline: "none",
              font: "inherit",
              fontSize: 12.5,
              resize: "none",
              color: "var(--ink)",
            }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
            <button
              type="button"
              onClick={() => {
                setDraft("");
                setComposerOpen(false);
              }}
              style={{
                padding: "5px 10px",
                borderRadius: 5,
                border: "1px solid var(--line)",
                background: "var(--panel)",
                color: "var(--ink-3)",
                fontSize: 11.5,
                cursor: "pointer",
              }}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!draft.trim()}
              style={{
                padding: "5px 12px",
                borderRadius: 5,
                border: 0,
                background: "var(--accent)",
                color: "white",
                fontSize: 11.5,
                fontWeight: 500,
                cursor: draft.trim() ? "pointer" : "not-allowed",
                opacity: draft.trim() ? 1 : 0.5,
              }}
            >
              게시
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// ─── History tab (matches manual2 right-panel.jsx) ──────────────
function HistoryTab({
  nodeId,
  versions,
}: {
  nodeId: string;
  versions: Version[];
}) {
  const { restoreVersion } = useWorkbench();
  return (
    <div className="history">
      {versions.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "40px 0",
            color: "var(--ink-3)",
          }}
        >
          <IcClock size={24} />
          <div style={{ marginTop: 8, fontSize: 12 }}>
            아직 저장된 버전이 없습니다.
          </div>
        </div>
      )}
      {versions.map((v, i) => (
        <div
          key={v.id}
          className={`h-item${i === 0 ? " current" : ""}`}
          onClick={() => {
            if (i > 0 && v.body) restoreVersion(nodeId, v.id);
          }}
        >
          <div className="h-dot" />
          <div className="h-body">
            <div className="h-when">{v.when}</div>
            <div className="h-by">
              {v.who} ·{" "}
              <span
                style={{
                  color: "var(--ink-3)",
                  fontWeight: 400,
                  fontFamily: "var(--font-en)",
                }}
              >
                {v.v}
              </span>
            </div>
            <div className="h-desc">{v.desc}</div>
            {v.tag && (
              <div className="h-tag">
                {v.tag === "approved" ? "승인" : "공개"}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
