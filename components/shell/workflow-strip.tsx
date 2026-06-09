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
  const {
    tree,
    activeId,
    locale,
    setNodeStatus,
    setRequiredApprover,
    setDocumentSensitivity,
    rejectDocument,
    can,
    members,
  } = useWorkbench();
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

  // 승인자 지정(그룹 4-②) — item 문서에만, 지정 권한은 approve 권한자.
  const isItem = node.type === "item";
  const canDesignate = isItem && can("approve");
  const approverCandidates = members.filter(
    (m) => m.role === "admin" || m.role === "reviewer",
  );
  const currentApprover =
    members.find((m) => m.id === node.requiredApproverId) ?? null;

  // SLA 배지(그룹 4-③) — review 상태 + 기한이 있을 때만. 클라이언트 계산.
  const inReview = (node.status ?? "draft") === "review";
  const deadlineMs =
    inReview && node.reviewDeadline ? new Date(node.reviewDeadline).getTime() : null;
  const slaDaysLeft =
    deadlineMs !== null
      ? Math.ceil((deadlineMs - Date.now()) / 86_400_000)
      : null;
  const slaOverdue = slaDaysLeft !== null && slaDaysLeft < 0;

  // 민감도(그룹 6) — item 에만. 분류는 approve 권한자. 배지는 general 외에만.
  const sensitivity = node.sensitivity ?? "general";
  const SENS_KO: Record<string, string> = {
    general: "일반",
    confidential: "기밀",
    restricted: "제한",
  };
  const SENS_COLOR: Record<string, string> = {
    confidential: "#b8860b",
    restricted: "#c0392b",
  };

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
          {isItem && sensitivity !== "general" && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 11,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 4,
                marginRight: 4,
                color: SENS_COLOR[sensitivity],
                background: `${SENS_COLOR[sensitivity]}1a`,
                border: `1px solid ${SENS_COLOR[sensitivity]}`,
              }}
              title={
                sensitivity === "restricted"
                  ? "관리자만 열람 가능"
                  : "관리자·검토자만 열람 가능"
              }
            >
              🔒 {SENS_KO[sensitivity]}
            </span>
          )}
          {canDesignate && (
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11.5,
                color: "var(--ink-2)",
                marginRight: 4,
              }}
              title="민감도를 올리면 열람 가능한 역할이 제한됩니다"
            >
              <span style={{ color: "var(--ink-3)" }}>
                {locale === "ko" ? "민감도" : "Sensitivity"}
              </span>
              <select
                value={sensitivity}
                onChange={(e) =>
                  setDocumentSensitivity(
                    activeId,
                    e.target.value as "general" | "confidential" | "restricted",
                  )
                }
                style={{
                  fontSize: 11.5,
                  padding: "3px 6px",
                  borderRadius: 4,
                  border: "1px solid var(--line)",
                  background: "var(--surface)",
                  color: "var(--ink)",
                }}
              >
                <option value="general">일반 (전원)</option>
                <option value="confidential">기밀 (검토자·관리자)</option>
                <option value="restricted">제한 (관리자)</option>
              </select>
            </label>
          )}
          {slaDaysLeft !== null && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 11,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 4,
                marginRight: 4,
                color: slaOverdue ? "#c0392b" : "var(--ink-2)",
                background: slaOverdue ? "rgba(192,57,43,0.1)" : "var(--surface-2)",
                border: `1px solid ${slaOverdue ? "#c0392b" : "var(--line)"}`,
              }}
              title={
                node.reviewDeadline
                  ? `검토 기한: ${new Date(node.reviewDeadline).toLocaleString("ko-KR")}`
                  : undefined
              }
            >
              {slaOverdue
                ? locale === "ko"
                  ? `기한 초과 ${Math.abs(slaDaysLeft)}일`
                  : `Overdue ${Math.abs(slaDaysLeft)}d`
                : slaDaysLeft === 0
                ? locale === "ko"
                  ? "오늘 마감"
                  : "Due today"
                : locale === "ko"
                ? `검토 기한 D-${slaDaysLeft}`
                : `Due in ${slaDaysLeft}d`}
            </span>
          )}
          {isItem && (canDesignate ? (
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11.5,
                color: "var(--ink-2)",
                marginRight: 4,
              }}
              title={
                locale === "ko"
                  ? "지정하면 이 사람만 승인할 수 있습니다"
                  : "Only this person can approve when set"
              }
            >
              <span style={{ color: "var(--ink-3)" }}>
                {locale === "ko" ? "승인자" : "Approver"}
              </span>
              <select
                value={node.requiredApproverId ?? ""}
                onChange={(e) =>
                  setRequiredApprover(activeId, e.target.value || null)
                }
                style={{
                  fontSize: 11.5,
                  padding: "3px 6px",
                  borderRadius: 4,
                  border: "1px solid var(--line)",
                  background: "var(--surface)",
                  color: "var(--ink)",
                  maxWidth: 140,
                }}
              >
                <option value="">
                  {locale === "ko" ? "지정 안 함 (누구나)" : "Anyone"}
                </option>
                {approverCandidates.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
          ) : currentApprover ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 11.5,
                color: "var(--ink-3)",
                marginRight: 4,
              }}
            >
              {locale === "ko" ? "승인자" : "Approver"}:{" "}
              <strong style={{ color: "var(--ink-2)" }}>
                {currentApprover.name}
              </strong>
            </span>
          ) : null)}
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
