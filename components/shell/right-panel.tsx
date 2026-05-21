"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  Clock,
  Download,
  List as ListIcon,
  MessageCircle,
  Send,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { findNode, useWorkbench } from "@/lib/workbench-context";
import type { Attachment, Case, Comment, Version } from "@/lib/types";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Tab = "outline" | "comments" | "history";

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

  // Outline derived from the stored body HTML — no live DOM observer to
  // avoid the MutationObserver↔setState↔re-render loop that froze the page.
  // Editor changes go through onUpdate→setBody and end up in content.body,
  // so this useMemo updates as you type (debounced via setBody).
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

  return (
    <aside className="rpanel">
      <div className="rp-tabs">
        <button
          type="button"
          className={tab === "outline" ? "on" : ""}
          onClick={() => setTab("outline")}
        >
          <ListIcon size={11} /> {t(locale, "outline")}
        </button>
        <button
          type="button"
          className={tab === "comments" ? "on" : ""}
          onClick={() => setTab("comments")}
        >
          <MessageCircle size={11} /> {t(locale, "comments")}
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
          <Clock size={11} /> {t(locale, "history")}
        </button>
      </div>

      <div className="rp-body">
        {tab === "outline" && (
          <div>
            {node && content?.body && content?.type !== "pdf" && (
              <AISummaryCard nodeLabel={node.label} />
            )}

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
              <h4>{t(locale, "tags")}</h4>
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
              <h4>{t(locale, "outline")}</h4>
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

        {tab === "comments" && (
          <CommentsTab nodeId={activeId} list={list} />
        )}

        {tab === "history" && (
          <HistoryTab nodeId={activeId} versions={versions} />
        )}
      </div>
    </aside>
  );
}

// ─── AI Summary ──────────────────────────────────────────────────────
function AISummaryCard({ nodeLabel }: { nodeLabel?: string }) {
  return (
    <div className="ai-summary">
      <div className="as-hd">
        <Sparkles size={11} /> AI 요약
      </div>
      <div className="as-body" style={{ marginBottom: 6 }}>
        {nodeLabel
          ? "이 문서의 핵심을 3~4문장으로 요약해드립니다."
          : "문서를 선택해주세요."}
      </div>
      <button type="button" className="as-gen-btn">
        <Sparkles size={11} /> 요약 생성
      </button>
    </div>
  );
}

// ─── Related Cases ───────────────────────────────────────────────────
const RESULT_LABEL: Record<
  Case["result"],
  { ko: string; cls: string }
> = {
  good: { ko: "우수", cls: "good" },
  bad: { ko: "실패", cls: "bad" },
  mixed: { ko: "복합", cls: "mixed" },
};

function RelatedCases({ cases }: { cases: Case[] }) {
  const { setView } = useWorkbench();
  return (
    <div className="related-cases meta-section">
      <h4>관련 응대 사례 ({cases.length})</h4>
      {cases.map((c) => (
        <div
          key={c.id}
          className="rc-card"
          onClick={() => setView("cases")}
          style={{ cursor: "pointer" }}
        >
          <div className="rc-hd">
            <span className={cn("res-pill", RESULT_LABEL[c.result].cls)}>
              {RESULT_LABEL[c.result].ko}
            </span>
            <span className="rc-id">{c.id}</span>
          </div>
          <div className="rc-ti">{c.title}</div>
          <div className="rc-meta">
            <span>{c.agent.name}</span>
            <span>·</span>
            <span>{c.date}</span>
            <span>·</span>
            <span>{c.duration}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Attachments helpers ─────────────────────────────────────────────
const FILE_KINDS: Record<string, { exts: string[]; label: string }> = {
  pdf: { exts: ["pdf"], label: "PDF" },
  doc: { exts: ["doc", "docx", "rtf", "odt", "hwp", "hwpx"], label: "DOC" },
  xls: { exts: ["xls", "xlsx", "ods"], label: "XLS" },
  ppt: { exts: ["ppt", "pptx", "odp", "key"], label: "PPT" },
  img: { exts: ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"], label: "IMG" },
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
          className={cn("attach-zone", over && "over")}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="ico-big" size={22} />
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
          <div className={cn("file-ico", u.kind)}>{kindLabel(u.kind)}</div>
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
            <a
              key={a.id}
              href={`/api/attachments/${a.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="attachment"
              title={a.fileName}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div className={cn("file-ico", kind)}>{kindLabel(kind)}</div>
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
                    e.preventDefault();
                    window.open(`/api/attachments/${a.id}`, "_blank");
                  }}
                >
                  <Download size={12} />
                </button>
                {canEdit && (
                  <button
                    type="button"
                    className="danger"
                    title="삭제"
                    onClick={(e) => {
                      e.preventDefault();
                      onDelete(a);
                    }}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </a>
          );
        })
      )}
    </div>
  );
}

// ─── Comments tab ────────────────────────────────────────────────────
function CommentsTab({
  nodeId,
  list,
}: {
  nodeId: string;
  list: Comment[];
}) {
  const { addComment, resolveComment } = useWorkbench();
  const [draft, setDraft] = useState("");

  return (
    <div className="comments">
      {list.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--ink-3)" }}>
          <MessageCircle size={24} style={{ opacity: 0.4 }} />
          <div style={{ marginTop: 8, fontSize: 12 }}>
            아직 댓글이 없습니다.
          </div>
        </div>
      ) : (
        list.map((c) => (
          <div key={c.id} className={cn("c-item", c.resolved && "resolved")}>
            <div className="c-hd">
              <div className="av" style={{ background: c.color }}>
                {c.initials}
              </div>
              <div className="nm">{c.who}</div>
              <div className="when">{c.when}</div>
            </div>
            <div className="c-body">{c.body}</div>
            <div className="c-actions">
              <button onClick={() => resolveComment(nodeId, c.id)}>
                {c.resolved ? "해결됨 ✓" : "해결"}
              </button>
            </div>
          </div>
        ))
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          addComment(nodeId, draft);
          setDraft("");
        }}
        style={{
          marginTop: 10,
          padding: 10,
          borderRadius: 8,
          background: "var(--panel)",
          border: "1px solid var(--line)",
        }}
      >
        <textarea
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
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
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
            <Send size={10} style={{ display: "inline", marginRight: 4 }} />
            게시
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── History tab ─────────────────────────────────────────────────────
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
        <p style={{ fontSize: 12, color: "var(--ink-3)" }}>
          아직 저장된 버전이 없습니다.
        </p>
      )}
      {versions.map((v, i) => (
        <div key={v.id} className={cn("h-item", i === 0 && "current")}>
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
            {i > 0 && v.body && (
              <button
                type="button"
                onClick={() => restoreVersion(nodeId, v.id)}
                style={{
                  border: "1px solid var(--line)",
                  background: "var(--bg-2)",
                  borderRadius: 5,
                  padding: "2px 8px",
                  fontSize: 11,
                  color: "var(--ink-2)",
                  cursor: "pointer",
                  marginTop: 6,
                }}
              >
                복원
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
