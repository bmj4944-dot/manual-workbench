"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, Paperclip } from "lucide-react";
import { useWorkbench, findNode } from "@/lib/workbench-context";
import { defaultBody } from "@/lib/sample-data";
import { DocumentEditor } from "@/components/editor/document-editor";
import { WorkflowStrip } from "./workflow-strip";
import { MustReadBar } from "./must-read-bar";
import { FeedbackBar } from "./feedback-bar";
import { PdfViewer } from "@/components/pdf/pdf-viewer";
import { cn } from "@/lib/utils";

const STATUS_PILL_KO: Record<string, string> = {
  draft: "초안",
  review: "검토중",
  approved: "승인",
  published: "공개",
};

export function MainPane() {
  const {
    tree,
    activeId,
    locale,
    can,
    content: contentMap,
    bodyOverrides,
    setBody,
    setSaveState,
    setDirty,
    favorites,
    toggleFavorite,
    attachPdf,
    attachments,
    mode,
  } = useWorkbench();
  const [attaching, setAttaching] = useState(false);
  const saveTimer = useRef<number | null>(null);
  const lastSavedRef = useRef<string>("");

  const node = findNode(tree, activeId);
  const content = contentMap[activeId];
  const baseBody = content?.body ?? defaultBody(activeId, node?.label ?? "");
  const body = bodyOverrides[activeId] ?? baseBody;
  const status = node?.status ?? "draft";
  const isPdf = node?.badge === "PDF";
  const isFav = favorites.includes(activeId);
  const nodeAttachments = attachments[activeId] ?? [];

  const canEdit = can("edit");
  const effectiveEditable = mode === "edit" && canEdit && !isPdf;

  useEffect(() => {
    lastSavedRef.current = body;
    setDirty(activeId, false);
    setSaveState("saved");
  }, [activeId, body, setDirty, setSaveState]);

  const onUpdate = useCallback(
    (html: string) => {
      if (html === lastSavedRef.current) return;
      setDirty(activeId, true);
      setSaveState("saving");
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        if (html === lastSavedRef.current) {
          setSaveState("saved");
          setDirty(activeId, false);
          return;
        }
        lastSavedRef.current = html;
        setBody(activeId, html);
        setSaveState("saved");
        setDirty(activeId, false);
      }, 800);
    },
    [activeId, setBody, setDirty, setSaveState],
  );

  useEffect(() => {
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, []);

  if (isPdf) {
    return (
      <>
        <WorkflowStrip />
        <div className="doc-head">
          <div className="tag-row">
            <span className="tag">
              {node?.type === "item"
                ? "항목"
                : node?.type === "section"
                ? "절"
                : "장"}
            </span>
            <span className="tag accent">{STATUS_PILL_KO[status]}</span>
            <span
              className="tag"
              style={{
                background: "var(--accent-2)",
                color: "var(--accent)",
              }}
            >
              PDF
            </span>
            <span style={{ flex: 1 }} />
            <button
              type="button"
              className={`fav-star${isFav ? " on" : ""}`}
              onClick={() => toggleFavorite(activeId)}
              title="즐겨찾기"
            >
              {isFav ? "★" : "☆"}
            </button>
          </div>
          <h1>
            {node
              ? locale === "ko"
                ? node.label
                : node.labelEn ?? node.label
              : ""}
          </h1>
        </div>
        <PdfViewer nodeId={activeId} />
        <div className="border-t border-line bg-surface px-10 py-3">
          <MustReadBar nodeId={activeId} />
        </div>
      </>
    );
  }

  return (
    <>
      <WorkflowStrip />
      {node && (
        <div className="doc-head">
          <div className="tag-row">
            <span className="tag">
              {node.type === "item"
                ? "항목"
                : node.type === "section"
                ? "절"
                : "장"}
            </span>
            <span className="tag accent">{STATUS_PILL_KO[status]}</span>
            {content?.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
            <span style={{ flex: 1 }} />
            <span style={{ color: "var(--ink-3)", fontSize: 11.5 }}>
              최근 수정:{" "}
              <b style={{ color: "var(--ink-2)", fontWeight: 600 }}>
                {content?.updated ?? "—"}
              </b>
            </span>
            <button
              type="button"
              className={`fav-star${isFav ? " on" : ""}`}
              onClick={() => toggleFavorite(activeId)}
              title="즐겨찾기"
            >
              {isFav ? "★" : "☆"}
            </button>
            {canEdit && (
              <label
                title="이 문서에 PDF 첨부"
                className={cn(
                  "flex h-7 cursor-pointer items-center gap-1 rounded-md border border-line bg-panel px-2 text-[11.5px] text-ink-2 hover:text-accent",
                  attaching && "cursor-wait opacity-60",
                )}
              >
                <Paperclip size={12} />
                {attaching ? "업로드 중..." : "PDF 첨부"}
                <input
                  type="file"
                  accept="application/pdf"
                  disabled={attaching}
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (!f) return;
                    setAttaching(true);
                    try {
                      await attachPdf(activeId, f);
                    } catch (err) {
                      console.error("attachPdf failed", err);
                    } finally {
                      setAttaching(false);
                    }
                  }}
                />
              </label>
            )}
          </div>
          <h1>{locale === "ko" ? node.label : node.labelEn ?? node.label}</h1>
          <div className="sub">
            {content?.author && (
              <>
                <span>
                  <b>{content.author}</b>
                  <span style={{ color: "var(--ink-3)" }}> · 작성자</span>
                </span>
                <span className="dot" />
              </>
            )}
            {content?.version && (
              <>
                <span>
                  버전 <b>{content.version}</b>
                </span>
                <span className="dot" />
              </>
            )}
            <span>
              <b>{nodeAttachments.length}</b> 첨부 파일
            </span>
            {node.hasComments ? (
              <>
                <span className="dot" />
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  <MessageCircle size={11} />
                  <b>{node.hasComments}</b> 댓글
                </span>
              </>
            ) : null}
          </div>
        </div>
      )}

      <DocumentEditor
        key={activeId}
        content={body}
        editable={effectiveEditable}
        onUpdate={onUpdate}
        bottomSlot={
          <>
            <MustReadBar nodeId={activeId} />
            <FeedbackBar nodeId={activeId} />
          </>
        }
      />
    </>
  );
}
