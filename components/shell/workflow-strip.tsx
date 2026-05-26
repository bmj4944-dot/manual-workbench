"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { findNode, useWorkbench } from "@/lib/workbench-context";
import type { NodeStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STAGES: { key: NodeStatus; ko: string; en: string; permission: string }[] = [
  { key: "draft", ko: "초안", en: "Draft", permission: "edit" },
  { key: "review", ko: "검토", en: "Review", permission: "edit" },
  { key: "approved", ko: "승인", en: "Approve", permission: "approve" },
  { key: "published", ko: "공개", en: "Publish", permission: "publish" },
];

export function WorkflowStrip() {
  const { tree, activeId, locale, setNodeStatus, rejectDocument, can } =
    useWorkbench();
  const node = findNode(tree, activeId);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // 문서가 바뀌면 거부 패널 닫고 사유 초기화
  useEffect(() => {
    setRejecting(false);
    setReason("");
    setSubmitting(false);
  }, [activeId]);

  useEffect(() => {
    if (rejecting) taRef.current?.focus();
  }, [rejecting]);

  if (!node) return null;
  const currentIdx = Math.max(
    0,
    STAGES.findIndex((s) => s.key === (node.status ?? "draft")),
  );
  const current = STAGES[currentIdx];
  const next = STAGES[currentIdx + 1];
  const prev = STAGES[currentIdx - 1];

  const advance = () => {
    if (next) setNodeStatus(activeId, next.key);
  };
  const revert = () => {
    if (prev) setNodeStatus(activeId, prev.key);
  };

  const canAdvance = next ? can(next.permission) : false;
  const canRevert = prev ? can(current.permission) : false;
  const canReject = (node.status ?? "draft") === "review" && can("review");

  const submitReject = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await rejectDocument(activeId, reason);
      // 성공 시 거부 패널 자동 정리 (rejectDocument 가 throw 없이 끝나면 OK)
      setRejecting(false);
      setReason("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="wf-strip">
        {STAGES.map((s, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          const last = i === STAGES.length - 1;
          return (
            <span key={s.key} style={{ display: "contents" }}>
              <div
                className={cn(
                  "step",
                  done && "done",
                  active && "active",
                )}
              >
                <span className="circ">
                  {done ? <Check size={10} /> : i + 1}
                </span>
                <span>{locale === "ko" ? s.ko : s.en}</span>
              </div>
              {!last && <span className="line" />}
            </span>
          );
        })}

        <div className="actions">
          {canReject && !rejecting && (
            <button
              type="button"
              className="wf-btn"
              onClick={() => setRejecting(true)}
              style={{ color: "#c0392b", borderColor: "#c0392b" }}
            >
              {locale === "ko" ? "거부" : "Reject"}
            </button>
          )}
          <button
            type="button"
            className="wf-btn"
            onClick={revert}
            disabled={!canRevert}
          >
            ← {locale === "ko" ? "이전 단계" : "Back"}
          </button>
          <button
            type="button"
            className="wf-btn primary"
            onClick={advance}
            disabled={!next || !canAdvance}
          >
            {next
              ? locale === "ko"
                ? `${next.ko} →`
                : `${next.en} →`
              : locale === "ko"
              ? "완료"
              : "Done"}
          </button>
        </div>
      </div>

      {rejecting && (
        <div
          style={{
            padding: "10px 12px",
            margin: "0 16px 8px",
            background: "var(--accent-2)",
            border: "1px dashed #c0392b",
            borderRadius: 6,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ fontSize: 12, color: "var(--ink-2)", fontWeight: 600 }}>
            {locale === "ko"
              ? "거부 사유 (작성자에게 댓글로 자동 전달)"
              : "Rejection reason (auto-posted as a comment)"}
          </div>
          <textarea
            ref={taRef}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                setRejecting(false);
                setReason("");
              } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void submitReject();
              }
            }}
            placeholder={
              locale === "ko"
                ? "어떤 부분을 보강해야 하는지 구체적으로 작성해주세요 (Cmd+Enter 제출, Esc 취소)"
                : "Be specific about what needs revision (Cmd+Enter to submit, Esc to cancel)"
            }
            maxLength={500}
            rows={3}
            disabled={submitting}
            style={{
              width: "100%",
              fontSize: 13,
              padding: 8,
              borderRadius: 4,
              border: "1px solid var(--line)",
              background: "var(--surface)",
              color: "var(--ink)",
              resize: "vertical",
              fontFamily: "inherit",
            }}
          />
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
            <button
              type="button"
              className="wf-btn"
              onClick={() => {
                setRejecting(false);
                setReason("");
              }}
              disabled={submitting}
            >
              {locale === "ko" ? "취소" : "Cancel"}
            </button>
            <button
              type="button"
              className="wf-btn"
              onClick={submitReject}
              disabled={submitting || !reason.trim()}
              style={{
                background: "#c0392b",
                borderColor: "#c0392b",
                color: "white",
              }}
            >
              {submitting
                ? locale === "ko"
                  ? "처리 중…"
                  : "Submitting…"
                : locale === "ko"
                ? "거부 확정"
                : "Confirm reject"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
