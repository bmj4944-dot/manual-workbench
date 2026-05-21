"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  Check,
  Download,
  RotateCcw,
  Send,
  Sparkles,
  Tag,
  Upload,
  X,
} from "lucide-react";
import { findNode, useWorkbench } from "@/lib/workbench-context";
import type { Attachment, Case, Comment, Version } from "@/lib/types";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const TABS = ["outline", "comments", "history"] as const;
type Tab = (typeof TABS)[number];

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

  const outline = content ? extractHeadings(content.body) : [];
  const tabCount: Record<Tab, number> = {
    outline: outline.length,
    comments: list.filter((c) => !c.resolved).length,
    history: versions.length,
  };

  return (
    <aside className="rpanel">
      <div className="rp-tabs">
        {TABS.map((tk) => (
          <button
            key={tk}
            type="button"
            onClick={() => setTab(tk)}
            className={tab === tk ? "on" : ""}
          >
            {t(locale, tk)}
            {tabCount[tk] > 0 && (
              <span
                style={{
                  fontFamily: "var(--font-en)",
                  fontSize: 10,
                  padding: "1px 5px",
                  borderRadius: 999,
                  background: tab === tk ? "var(--accent-2)" : "var(--bg-3)",
                  color: tab === tk ? "var(--accent)" : "var(--ink-3)",
                  marginLeft: 3,
                }}
              >
                {tabCount[tk]}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="rp-body">
        {tab === "outline" && (
          <>
            <AISummaryCard nodeLabel={node?.label} />

            {relatedCases.length > 0 && (
              <RelatedCases cases={relatedCases} />
            )}

            <AttachmentsSection
              nodeId={activeId}
              attachments={nodeAttachments}
            />

            {content && content.tags.length > 0 && (
              <div className="meta-section">
                <div className="ms-hd">
                  <h4>
                    <Tag size={10} style={{ display: "inline", marginRight: 4 }} />
                    {t(locale, "tags")}
                  </h4>
                </div>
                <div className="tags-row">
                  {content.tags.map((tag) => (
                    <span key={tag} className="tg">
                      {tag}
                    </span>
                  ))}
                  <button type="button" className="tg add">
                    + 추가
                  </button>
                </div>
              </div>
            )}

            <div className="meta-section">
              <h4>{t(locale, "outline")}</h4>
              {outline.length === 0 ? (
                <p style={{ fontSize: 12, color: "var(--ink-3)" }}>
                  {t(locale, "selectDoc")}
                </p>
              ) : (
                <ul
                  className="outline"
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }}
                >
                  {outline.map((h, i) => (
                    <li
                      key={i}
                      className={`o-item l${h.level - 1}`}
                      title={h.text}
                    >
                      {h.text}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {content && (
              <div className="meta-section">
                <h4>메타</h4>
                <dl
                  style={{
                    fontSize: 12,
                    color: "var(--ink-3)",
                    margin: 0,
                    display: "grid",
                    gridTemplateColumns: "auto 1fr",
                    gap: "4px 12px",
                  }}
                >
                  <dt>{t(locale, "author")}</dt>
                  <dd style={{ color: "var(--ink-2)", margin: 0 }}>
                    {content.author}
                  </dd>
                  <dt>{t(locale, "updated")}</dt>
                  <dd style={{ color: "var(--ink-2)", margin: 0 }}>
                    {content.updated}
                  </dd>
                  <dt>{t(locale, "version")}</dt>
                  <dd style={{ color: "var(--ink-2)", margin: 0 }}>
                    {content.version}
                  </dd>
                </dl>
              </div>
            )}
          </>
        )}

        {tab === "comments" && <CommentsTab nodeId={activeId} list={list} />}

        {tab === "history" && (
          <HistoryTab nodeId={activeId} versions={versions} />
        )}
      </div>
    </aside>
  );
}

function AISummaryCard({ nodeLabel }: { nodeLabel?: string }) {
  return (
    <div className="ai-summary">
      <div className="as-hd">
        <Sparkles size={11} /> AI 요약
      </div>
      <div className="as-body" style={{ marginBottom: 6 }}>
        {nodeLabel
          ? `이 문서의 핵심을 3~4문장으로 요약해드립니다.`
          : "문서를 선택해주세요."}
      </div>
      <button type="button" className="as-gen-btn">
        <Sparkles size={11} /> 요약 생성
      </button>
    </div>
  );
}

const RESULT_LABEL: Record<Case["result"], { ko: string; cls: string }> = {
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

function classifyExtension(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["pdf"].includes(ext)) return "pdf";
  if (["doc", "docx"].includes(ext)) return "doc";
  if (["xls", "xlsx"].includes(ext)) return "xls";
  if (["ppt", "pptx", "key"].includes(ext)) return "ppt";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return "img";
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return "zip";
  if (["csv"].includes(ext)) return "csv";
  if (["txt", "md", "rtf"].includes(ext)) return "txt";
  return "txt";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

type Uploading = { id: string; fileName: string; progress: number };

function AttachmentsSection({
  nodeId,
  attachments,
}: {
  nodeId: string;
  attachments: Attachment[];
}) {
  const { uploadAttachment, deleteAttachment, can } = useWorkbench();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [over, setOver] = useState(false);
  const [uploading, setUploading] = useState<Uploading[]>([]);
  const canEdit = can("edit");

  const onFiles = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files);
      for (const file of arr) {
        const tempId = `tmp-${Date.now()}-${Math.random()}`;
        setUploading((prev) => [
          ...prev,
          { id: tempId, fileName: file.name, progress: 5 },
        ]);
        // Simulated progress while server upload runs
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

  // drag listeners
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (canEdit) setOver(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setOver(false);
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setOver(false);
    if (!canEdit) return;
    if (e.dataTransfer.files?.length) onFiles(e.dataTransfer.files);
  };

  const onDelete = (a: Attachment) => {
    if (!confirm(`"${a.fileName}" 첨부를 삭제할까요?`)) return;
    deleteAttachment(nodeId, a.id);
  };

  return (
    <div className="meta-section">
      <div className="ms-hd">
        <h4>첨부 파일 ({attachments.length})</h4>
        {canEdit && (
          <button
            type="button"
            className="ms-add"
            onClick={() => inputRef.current?.click()}
          >
            + 추가
          </button>
        )}
      </div>

      {canEdit && (
        <div
          ref={dropRef}
          className={cn("att-dropzone", over && "over")}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <div className="dz-ico">
            <Upload size={14} />
          </div>
          <div className="dz-ti">파일을 끌어다 놓거나 클릭</div>
          <div className="dz-sub">PDF · DOC · XLS · IMG · 모든 파일 지원</div>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files?.length) onFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      )}

      {uploading.map((u) => (
        <div key={u.id} className="attachment">
          <div className={cn("pdf-ico", classifyExtension(u.fileName))}>
            {classifyExtension(u.fileName).toUpperCase().slice(0, 3)}
          </div>
          <div className="at-body">
            <div className="at-name">{u.fileName}</div>
            <div className="at-meta">업로드 중... {u.progress}%</div>
            <div className="at-progress">
              <div style={{ width: `${u.progress}%` }} />
            </div>
          </div>
        </div>
      ))}

      {attachments.map((a) => {
        const kind = classifyExtension(a.fileName);
        return (
          <a
            key={a.id}
            href={`/api/attachments/${a.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="attachment"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div className={cn("pdf-ico", kind)}>{kind.toUpperCase().slice(0, 3)}</div>
            <div className="at-body">
              <div className="at-name">{a.fileName}</div>
              <div className="at-meta">
                {formatSize(a.fileSize)} · {formatDate(a.uploadedAt)}
                {a.uploaderName !== "—" ? ` · ${a.uploaderName}` : ""}
              </div>
            </div>
            <div className="at-actions">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  window.open(`/api/attachments/${a.id}`, "_blank");
                }}
                title="다운로드"
              >
                <Download size={12} />
              </button>
              {canEdit && (
                <button
                  type="button"
                  className="danger"
                  onClick={(e) => {
                    e.preventDefault();
                    onDelete(a);
                  }}
                  title="삭제"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </a>
        );
      })}

      {attachments.length === 0 && uploading.length === 0 && (
        <div
          style={{
            fontSize: 11.5,
            color: "var(--ink-4)",
            textAlign: "center",
            padding: "4px 0",
            fontStyle: "italic",
          }}
        >
          첨부된 파일이 없습니다.
        </div>
      )}
    </div>
  );
}

function CommentsTab({ nodeId, list }: { nodeId: string; list: Comment[] }) {
  const { addComment, resolveComment } = useWorkbench();
  const [draft, setDraft] = useState("");
  const [showResolved, setShowResolved] = useState(false);
  const visible = showResolved ? list : list.filter((c) => !c.resolved);

  return (
    <div className="comments">
      {visible.map((c) => (
        <div key={c.id} className={cn("c-item", c.resolved && "resolved")}>
          <div className="c-hd">
            <span className="av" style={{ background: c.color }}>
              {c.initials}
            </span>
            <span className="nm">{c.who}</span>
            <span className="when">{c.when}</span>
          </div>
          <div className="c-body">{c.body}</div>
          <div className="c-actions">
            <button onClick={() => resolveComment(nodeId, c.id)}>
              <Check size={10} style={{ display: "inline", marginRight: 2 }} />
              {c.resolved ? "해결됨" : "해결"}
            </button>
          </div>
        </div>
      ))}
      {visible.length === 0 && (
        <div
          style={{
            border: "1px dashed var(--line)",
            borderRadius: 6,
            padding: 14,
            textAlign: "center",
            fontSize: 12,
            color: "var(--ink-3)",
          }}
        >
          아직 댓글이 없습니다.
        </div>
      )}
      <button
        type="button"
        onClick={() => setShowResolved((v) => !v)}
        style={{
          background: "transparent",
          border: 0,
          color: "var(--ink-3)",
          fontSize: 11.5,
          marginTop: 4,
          cursor: "pointer",
        }}
      >
        {showResolved
          ? "해결된 댓글 숨기기"
          : `해결된 댓글 보기 (${list.filter((c) => c.resolved).length})`}
      </button>

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
          <span className="h-dot" />
          <div className="h-body">
            <div className="h-when">
              {v.v} · {v.when}
            </div>
            <div className="h-by">{v.who}</div>
            <div className="h-desc">{v.desc}</div>
            {v.tag && (
              <span className="h-tag">
                {v.tag === "approved" ? "승인" : "공개"}
              </span>
            )}
            {i > 0 && v.body && (
              <button
                type="button"
                onClick={() => restoreVersion(nodeId, v.id)}
                style={{
                  border: "1px solid var(--line)",
                  background: "var(--surface-2)",
                  borderRadius: 5,
                  padding: "2px 8px",
                  fontSize: 11,
                  color: "var(--ink-2)",
                  cursor: "pointer",
                  marginTop: 6,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <RotateCcw size={10} /> 복원
              </button>
            )}
          </div>
        </div>
      ))}
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
