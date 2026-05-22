"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, Paperclip } from "lucide-react";
import { useWorkbench, findNode } from "@/lib/workbench-context";
import { toast, toastErrorMessage } from "@/lib/toast";
import { recordPageStatAction } from "@/lib/actions/page-stats";
import { verifyLabel, verifyState } from "@/lib/utils";

// Throttle "view" events per-tab. Module-level so MainPane unmount/remount
// (caused by view switches) doesn't reset the window. Keyed by document id;
// the value is the last bump timestamp.
const VIEW_THROTTLE_MS = 5 * 60_000;
const lastViewedAt = new Map<string, number>();
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
    verifications,
    mode,
  } = useWorkbench();
  const [attaching, setAttaching] = useState(false);
  const saveTimer = useRef<number | null>(null);
  const lastSavedRef = useRef<string>("");

  const node = findNode(tree, activeId);
  const content = contentMap[activeId];
  const baseBody = content?.body ?? defaultBody(node?.label ?? "");
  const body = bodyOverrides[activeId] ?? baseBody;
  const status = node?.status ?? "draft";
  const isPdf = node?.badge === "PDF";
  const isFav = favorites.includes(activeId);
  const verification = verifications[activeId];
  const vState = verification ? verifyState(verification) : null;
  const nodeAttachments = attachments[activeId] ?? [];

  const canEdit = can("edit");
  const effectiveEditable = mode === "edit" && canEdit && !isPdf;

  useEffect(() => {
    lastSavedRef.current = body;
    setDirty(activeId, false);
    setSaveState("saved");
  }, [activeId, body, setDirty, setSaveState]);

  // ── View tracking ─────────────────────────────────────────────────
  // Bump page_stats.views once per document per VIEW_THROTTLE_MS in this
  // tab. Refresh resets the throttle (acceptable — bot/refresh spam is a
  // separate problem, not what this counter is for).
  useEffect(() => {
    if (!activeId) return;
    const now = Date.now();
    const last = lastViewedAt.get(activeId) ?? 0;
    if (now - last < VIEW_THROTTLE_MS) return;
    lastViewedAt.set(activeId, now);
    void recordPageStatAction(activeId, "view");
  }, [activeId]);

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
            {vState && verification && (
              <span
                className={`verify-pill ${vState}`}
                title={`마지막 검증: ${verification.lastVerified}일 전 · 주기 ${verification.intervalDays}일 · 검증자 ${verification.by}`}
              >
                {verifyLabel(vState, verification)}
              </span>
            )}
            {content?.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
            {nodeAttachments.length > 0 && (
              <button
                type="button"
                className="attach-pill"
                onClick={() =>
                  document
                    .getElementById("attachments-section")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
                title={`첨부 ${nodeAttachments.length}개 — 클릭하면 첨부 섹션으로 이동`}
                aria-label={`첨부 ${nodeAttachments.length}개`}
              >
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 14 14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10 6.5 5.5 11A2.5 2.5 0 0 1 2 7.5L7 2.5a1.7 1.7 0 0 1 2.4 2.4L4.5 9.8a0.9 0.9 0 0 1-1.3-1.3L7.5 4.2" />
                </svg>
                첨부 <b>{nodeAttachments.length}</b>
              </button>
            )}
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
                      toast.error(
                        toastErrorMessage(err, "PDF 첨부에 실패했습니다."),
                      );
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
            {vState === "stale" && verification && (
              <VerifyBar verification={verification} />
            )}
            <MustReadBar nodeId={activeId} />
            <FeedbackBar />
          </>
        }
      />
    </>
  );
}

// ─── VerifyBar ──────────────────────────────────────────────────────
// Shown below the doc body when the document's verification interval has
// elapsed. Re-verification itself (clicking the button) belongs to the
// verify queue workflow (see C-5 todo) — for now the button is a no-op
// shell that signals intent.
function VerifyBar({
  verification,
}: {
  verification: { lastVerified: number; intervalDays: number; by: string };
}) {
  const over = Math.max(0, verification.lastVerified - verification.intervalDays);
  return (
    <div className="verify-bar" role="alert">
      <div className="ic" aria-hidden="true">
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="7" cy="7" r="5.5" />
          <line x1="7" y1="4" x2="7" y2="7.5" />
          <circle cx="7" cy="10" r="0.6" fill="currentColor" />
        </svg>
      </div>
      <div className="body">
        <div className="ti">재검증이 필요합니다</div>
        <div className="ms">
          마지막 검증 후 <b>{verification.lastVerified}일</b> 경과 ·
          주기 <b>{verification.intervalDays}일</b>
          {over > 0 && (
            <> · 만료 <b>{over}일</b> 초과</>
          )}{" "}
          · 검증자 <b>{verification.by}</b>
        </div>
      </div>
      <button
        type="button"
        title="검증 큐 워크플로우는 곧 추가됩니다 (C-5)"
        onClick={() => {
          toast.info("재검증 워크플로우는 곧 추가됩니다.");
        }}
      >
        재검증 시작
      </button>
    </div>
  );
}
