"use client";

import { useState, useTransition } from "react";
import { deleteCaseAction, saveCaseAction } from "@/lib/actions/cases";
import { toast, toastErrorMessage } from "@/lib/toast";
import type { ManageCase } from "@/lib/data/cases";
import type { TreeNode } from "@/lib/types";
import {
  ConsoleHeader,
  DangerButton,
  DocSelect,
  DynamicList,
  EmptyState,
  Labeled,
  MasterDetailGrid,
  panelStyle,
  PrimaryButton,
  Select,
  TextArea,
  TextInput,
} from "../_widgets";

type CaseResult = "good" | "bad" | "mixed";

const RESULT_OPTIONS = [
  { value: "good", label: "우수" },
  { value: "bad", label: "실패" },
  { value: "mixed", label: "복합" },
];

const RESULT_BADGE: Record<CaseResult, { label: string; color: string }> = {
  good: { label: "우수", color: "oklch(0.62 0.15 150)" },
  bad: { label: "실패", color: "oklch(0.62 0.18 25)" },
  mixed: { label: "복합", color: "oklch(0.68 0.13 80)" },
};

type Draft = {
  id: string | null;
  title: string;
  summary: string;
  result: CaseResult;
  occurredAt: string;
  durationText: string;
  channel: string;
  agentId: string;
  linkedDocumentId: string;
  transcript: { speaker: string; text: string }[];
  lessons: { text: string }[];
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyDraft(): Draft {
  return {
    id: null,
    title: "",
    summary: "",
    result: "good",
    occurredAt: today(),
    durationText: "",
    channel: "",
    agentId: "",
    linkedDocumentId: "",
    transcript: [{ speaker: "", text: "" }],
    lessons: [{ text: "" }],
  };
}

function toDraft(c: ManageCase): Draft {
  return {
    id: c.id,
    title: c.title,
    summary: c.summary,
    result: c.result,
    occurredAt: c.occurredAt.slice(0, 10),
    durationText: c.durationText,
    channel: c.channel,
    agentId: c.agentId ?? "",
    linkedDocumentId: c.linkedDocumentId ?? "",
    transcript: c.transcript.length
      ? c.transcript.map((l) => ({ ...l }))
      : [{ speaker: "", text: "" }],
    lessons: c.lessons.length
      ? c.lessons.map((text) => ({ text }))
      : [{ text: "" }],
  };
}

export function CasesClient({
  cases,
  agents,
  tree,
}: {
  cases: ManageCase[];
  agents: { id: string; name: string }[];
  tree: TreeNode[];
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pending, startTransition] = useTransition();

  const patch = (p: Partial<Draft>) =>
    setDraft((d) => (d ? { ...d, ...p } : d));

  const save = () => {
    if (!draft) return;
    startTransition(async () => {
      try {
        const res = await saveCaseAction({
          id: draft.id,
          title: draft.title,
          summary: draft.summary,
          result: draft.result,
          occurredAt: draft.occurredAt,
          durationText: draft.durationText,
          channel: draft.channel,
          agentId: draft.agentId || null,
          linkedDocumentId: draft.linkedDocumentId || null,
          transcript: draft.transcript,
          lessons: draft.lessons.map((l) => l.text),
        });
        if (res.ok) {
          toast.success("사례를 저장했습니다.");
          setDraft((d) => (d ? { ...d, id: res.data.id } : d));
        } else toast.error(res.reason);
      } catch (err) {
        console.error("saveCaseAction failed", err);
        toast.error(toastErrorMessage(err, "사례 저장에 실패했습니다."));
      }
    });
  };

  const remove = () => {
    if (!draft?.id) return;
    if (!window.confirm("이 사례를 삭제할까요? 되돌릴 수 없습니다.")) return;
    const id = draft.id;
    startTransition(async () => {
      try {
        const res = await deleteCaseAction(id);
        if (res.ok) {
          toast.success("사례를 삭제했습니다.");
          setDraft(null);
        } else toast.error(res.reason);
      } catch (err) {
        console.error("deleteCaseAction failed", err);
        toast.error(toastErrorMessage(err, "사례 삭제에 실패했습니다."));
      }
    });
  };

  const agentOptions = [
    { value: "", label: "— 미지정 —" },
    ...agents.map((a) => ({ value: a.id, label: a.name })),
  ];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <ConsoleHeader
        count={cases.length}
        noun="사례"
        onNew={() => setDraft(emptyDraft())}
        newLabel="+ 새 사례"
      />

      <MasterDetailGrid>
        {/* 목록 */}
        <div style={{ ...panelStyle, overflow: "hidden" }}>
          {cases.length === 0 ? (
            <EmptyState>등록된 사례가 없습니다.</EmptyState>
          ) : (
            cases.map((c) => {
              const active = draft?.id === c.id;
              const badge = RESULT_BADGE[c.result];
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setDraft(toDraft(c))}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 12px",
                    border: 0,
                    borderBottom: "1px solid var(--line)",
                    background: active ? "var(--surface-2, var(--surface))" : "transparent",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginBottom: 3,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: badge.color,
                      }}
                    >
                      {badge.label}
                    </span>
                    <span style={{ fontSize: 10.5, color: "var(--ink-3)" }}>
                      {c.id}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--ink)",
                      fontWeight: active ? 600 : 400,
                    }}
                  >
                    {c.title || "(제목 없음)"}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* 편집 */}
        <div style={{ ...panelStyle, padding: 16 }}>
          {!draft ? (
            <EmptyState>
              왼쪽에서 사례를 선택하거나 “+ 새 사례”로 추가하세요.
            </EmptyState>
          ) : (
            <>
              <Labeled label="제목">
                <TextInput
                  value={draft.title}
                  onChange={(v) => patch({ title: v })}
                  placeholder="사례 제목"
                  disabled={pending}
                />
              </Labeled>
              <Labeled label="요약">
                <TextArea
                  value={draft.summary}
                  onChange={(v) => patch({ summary: v })}
                  placeholder="무슨 일이 있었고 어떻게 응대했는지"
                  disabled={pending}
                  rows={3}
                />
              </Labeled>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Labeled label="결과">
                  <Select
                    value={draft.result}
                    onChange={(v) => patch({ result: v as CaseResult })}
                    options={RESULT_OPTIONS}
                    disabled={pending}
                  />
                </Labeled>
                <Labeled label="발생일">
                  <input
                    type="date"
                    value={draft.occurredAt}
                    onChange={(e) => patch({ occurredAt: e.target.value })}
                    disabled={pending}
                    style={{
                      width: "100%",
                      padding: "7px 10px",
                      borderRadius: 6,
                      border: "1px solid var(--line)",
                      background: "var(--panel)",
                      color: "var(--ink)",
                      fontSize: 13,
                      fontFamily: "inherit",
                      boxSizing: "border-box",
                    }}
                  />
                </Labeled>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Labeled label="소요 시간" hint="예: 32분">
                  <TextInput
                    value={draft.durationText}
                    onChange={(v) => patch({ durationText: v })}
                    disabled={pending}
                  />
                </Labeled>
                <Labeled label="채널" hint="예: 전화, 채팅">
                  <TextInput
                    value={draft.channel}
                    onChange={(v) => patch({ channel: v })}
                    disabled={pending}
                  />
                </Labeled>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Labeled label="담당 상담사">
                  <Select
                    value={draft.agentId}
                    onChange={(v) => patch({ agentId: v })}
                    options={agentOptions}
                    disabled={pending}
                  />
                </Labeled>
                <Labeled label="연결 매뉴얼">
                  <DocSelect
                    value={draft.linkedDocumentId}
                    onChange={(v) => patch({ linkedDocumentId: v })}
                    tree={tree}
                    disabled={pending}
                  />
                </Labeled>
              </div>

              <Labeled label="대화록" hint="화자 + 발화 내용">
                <DynamicList
                  items={draft.transcript}
                  onChange={(transcript) => patch({ transcript })}
                  empty={() => ({ speaker: "", text: "" })}
                  addLabel="+ 대화 추가"
                  renderRow={(line, update) => (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <TextInput
                        value={line.speaker}
                        onChange={(speaker) => update({ speaker })}
                        placeholder="화자 (고객 / 상담사)"
                        disabled={pending}
                      />
                      <TextInput
                        value={line.text}
                        onChange={(text) => update({ text })}
                        placeholder="발화 내용"
                        disabled={pending}
                      />
                    </div>
                  )}
                />
              </Labeled>

              <Labeled label="교훈 / 시사점">
                <DynamicList
                  items={draft.lessons}
                  onChange={(lessons) => patch({ lessons })}
                  empty={() => ({ text: "" })}
                  addLabel="+ 교훈 추가"
                  renderRow={(lesson, update) => (
                    <TextInput
                      value={lesson.text}
                      onChange={(text) => update({ text })}
                      placeholder="이 사례에서 얻은 교훈"
                      disabled={pending}
                    />
                  )}
                />
              </Labeled>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginTop: 16,
                  paddingTop: 16,
                  borderTop: "1px solid var(--line)",
                }}
              >
                <PrimaryButton onClick={save} disabled={pending}>
                  {pending ? "저장 중…" : "저장"}
                </PrimaryButton>
                {draft.id ? (
                  <DangerButton onClick={remove} disabled={pending}>
                    삭제
                  </DangerButton>
                ) : null}
                <span style={{ flex: 1 }} />
                {draft.id ? (
                  <span style={{ alignSelf: "center", fontSize: 11, color: "var(--ink-3)" }}>
                    {draft.id}
                  </span>
                ) : null}
              </div>
            </>
          )}
        </div>
      </MasterDetailGrid>
    </div>
  );
}
