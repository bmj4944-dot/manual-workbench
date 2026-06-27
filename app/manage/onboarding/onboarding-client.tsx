"use client";

import { useState, useTransition } from "react";
import {
  deleteOnboardingTaskAction,
  saveOnboardingTaskAction,
} from "@/lib/actions/onboarding";
import { toast, toastErrorMessage } from "@/lib/toast";
import type { ManageOnboardingTask } from "@/lib/data/onboarding";
import type { TreeNode } from "@/lib/types";
import {
  ConsoleHeader,
  DangerButton,
  DocSelect,
  DynamicList,
  EmptyState,
  GhostButton,
  Labeled,
  MasterDetailGrid,
  NumberInput,
  panelStyle,
  PrimaryButton,
  Select,
  TextArea,
  TextInput,
} from "../_widgets";

type OnboardingType = "read" | "quiz" | "practice";

const TYPE_OPTIONS = [
  { value: "read", label: "필독" },
  { value: "quiz", label: "퀴즈" },
  { value: "practice", label: "실습" },
];

const TYPE_BADGE: Record<OnboardingType, { label: string; color: string }> = {
  read: { label: "필독", color: "oklch(0.6 0.13 250)" },
  quiz: { label: "퀴즈", color: "oklch(0.62 0.15 300)" },
  practice: { label: "실습", color: "oklch(0.62 0.15 150)" },
};

type DraftQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

type Draft = {
  id: string | null;
  type: OnboardingType;
  title: string;
  description: string;
  sectionId: string;
  estimate: string;
  sortOrder: number;
  questions: DraftQuestion[];
};

function emptyQuestion(): DraftQuestion {
  return { question: "", options: ["", ""], correctIndex: 0, explanation: "" };
}

function emptyDraft(nextSort: number): Draft {
  return {
    id: null,
    type: "read",
    title: "",
    description: "",
    sectionId: "",
    estimate: "",
    sortOrder: nextSort,
    questions: [],
  };
}

function toDraft(t: ManageOnboardingTask): Draft {
  return {
    id: t.id,
    type: t.type,
    title: t.title,
    description: t.description,
    sectionId: t.sectionId ?? "",
    estimate: t.estimate,
    sortOrder: t.sortOrder,
    questions: t.questions.map((q) => ({
      question: q.question,
      options: [...q.options],
      correctIndex: q.correctIndex,
      explanation: q.explanation,
    })),
  };
}

export function OnboardingClient({
  tasks,
  tree,
}: {
  tasks: ManageOnboardingTask[];
  tree: TreeNode[];
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pending, startTransition] = useTransition();

  const patch = (p: Partial<Draft>) =>
    setDraft((d) => (d ? { ...d, ...p } : d));

  const nextSort = tasks.reduce((m, t) => Math.max(m, t.sortOrder + 1), 0);

  const save = () => {
    if (!draft) return;
    startTransition(async () => {
      try {
        const res = await saveOnboardingTaskAction({
          id: draft.id,
          type: draft.type,
          title: draft.title,
          description: draft.description,
          sectionId: draft.sectionId || null,
          estimate: draft.estimate,
          sortOrder: draft.sortOrder,
          questions: draft.questions,
        });
        if (res.ok) {
          toast.success("온보딩 항목을 저장했습니다.");
          setDraft((d) => (d ? { ...d, id: res.data.id } : d));
        } else toast.error(res.reason);
      } catch (err) {
        console.error("saveOnboardingTaskAction failed", err);
        toast.error(toastErrorMessage(err, "저장에 실패했습니다."));
      }
    });
  };

  const remove = () => {
    if (!draft?.id) return;
    if (!window.confirm("이 항목을 삭제할까요? 진행 기록도 함께 사라집니다."))
      return;
    const id = draft.id;
    startTransition(async () => {
      try {
        const res = await deleteOnboardingTaskAction(id);
        if (res.ok) {
          toast.success("항목을 삭제했습니다.");
          setDraft(null);
        } else toast.error(res.reason);
      } catch (err) {
        console.error("deleteOnboardingTaskAction failed", err);
        toast.error(toastErrorMessage(err, "삭제에 실패했습니다."));
      }
    });
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <ConsoleHeader
        count={tasks.length}
        noun="온보딩 항목"
        onNew={() => setDraft(emptyDraft(nextSort))}
        newLabel="+ 새 항목"
      />

      <MasterDetailGrid>
        {/* 목록 */}
        <div style={{ ...panelStyle, overflow: "hidden" }}>
          {tasks.length === 0 ? (
            <EmptyState>등록된 온보딩 항목이 없습니다.</EmptyState>
          ) : (
            tasks.map((t) => {
              const active = draft?.id === t.id;
              const badge = TYPE_BADGE[t.type];
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setDraft(toDraft(t))}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 12px",
                    border: 0,
                    borderBottom: "1px solid var(--line)",
                    background: active
                      ? "var(--surface-2, var(--surface))"
                      : "transparent",
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
                      style={{ fontSize: 10, fontWeight: 700, color: badge.color }}
                    >
                      {badge.label}
                    </span>
                    {t.type === "quiz" && t.questions.length ? (
                      <span style={{ fontSize: 10, color: "var(--ink-3)" }}>
                        문항 {t.questions.length}
                      </span>
                    ) : null}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--ink)",
                      fontWeight: active ? 600 : 400,
                    }}
                  >
                    {t.title || "(제목 없음)"}
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
              왼쪽에서 항목을 선택하거나 “+ 새 항목”으로 추가하세요.
            </EmptyState>
          ) : (
            <>
              <div
                style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
              >
                <Labeled label="유형">
                  <Select
                    value={draft.type}
                    onChange={(v) => patch({ type: v as OnboardingType })}
                    options={TYPE_OPTIONS}
                    disabled={pending}
                  />
                </Labeled>
                <Labeled label="정렬 순서">
                  <NumberInput
                    value={draft.sortOrder}
                    onChange={(v) => patch({ sortOrder: v })}
                    step={1}
                    disabled={pending}
                  />
                </Labeled>
              </div>

              <Labeled label="제목">
                <TextInput
                  value={draft.title}
                  onChange={(v) => patch({ title: v })}
                  placeholder="예: 전화 응대 스크립트 정독"
                  disabled={pending}
                />
              </Labeled>
              <Labeled label="설명">
                <TextArea
                  value={draft.description}
                  onChange={(v) => patch({ description: v })}
                  placeholder="이 단계에서 학습할 내용"
                  disabled={pending}
                  rows={2}
                />
              </Labeled>

              <div
                style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 12 }}
              >
                <Labeled label="연결 매뉴얼">
                  <DocSelect
                    value={draft.sectionId}
                    onChange={(v) => patch({ sectionId: v })}
                    tree={tree}
                    disabled={pending}
                  />
                </Labeled>
                <Labeled label="예상 시간" hint="예: 10분">
                  <TextInput
                    value={draft.estimate}
                    onChange={(v) => patch({ estimate: v })}
                    disabled={pending}
                  />
                </Labeled>
              </div>

              {draft.type === "quiz" ? (
                <Labeled label="퀴즈 문항" hint="정답을 라디오로 선택">
                  <DynamicList
                    items={draft.questions}
                    onChange={(questions) => patch({ questions })}
                    empty={emptyQuestion}
                    addLabel="+ 문항 추가"
                    renderRow={(q, update, qi) => (
                      <div
                        style={{ display: "flex", flexDirection: "column", gap: 8 }}
                      >
                        <TextInput
                          value={q.question}
                          onChange={(question) => update({ question })}
                          placeholder={`문항 ${qi + 1}`}
                          disabled={pending}
                        />
                        <div
                          style={{ display: "flex", flexDirection: "column", gap: 5 }}
                        >
                          {q.options.map((opt, oi) => (
                            <div
                              key={oi}
                              style={{ display: "flex", alignItems: "center", gap: 6 }}
                            >
                              <input
                                type="radio"
                                name={`correct-${qi}`}
                                checked={q.correctIndex === oi}
                                onChange={() => update({ correctIndex: oi })}
                                disabled={pending}
                                title="정답"
                              />
                              <div style={{ flex: 1 }}>
                                <TextInput
                                  value={opt}
                                  onChange={(v) =>
                                    update({
                                      options: q.options.map((o, j) =>
                                        j === oi ? v : o,
                                      ),
                                    })
                                  }
                                  placeholder={`보기 ${oi + 1}`}
                                  disabled={pending}
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const options = q.options.filter(
                                    (_, j) => j !== oi,
                                  );
                                  const correctIndex =
                                    q.correctIndex >= options.length
                                      ? Math.max(0, options.length - 1)
                                      : q.correctIndex;
                                  update({ options, correctIndex });
                                }}
                                disabled={pending || q.options.length <= 2}
                                aria-label="보기 삭제"
                                title="보기 삭제"
                                style={{
                                  width: 22,
                                  height: 26,
                                  borderRadius: 4,
                                  border: "1px solid var(--line)",
                                  background: "var(--panel)",
                                  color: "var(--ink-3)",
                                  cursor:
                                    pending || q.options.length <= 2
                                      ? "not-allowed"
                                      : "pointer",
                                  opacity: q.options.length <= 2 ? 0.4 : 1,
                                }}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                          <GhostButton
                            onClick={() =>
                              update({ options: [...q.options, ""] })
                            }
                            disabled={pending}
                          >
                            + 보기
                          </GhostButton>
                        </div>
                        <TextInput
                          value={q.explanation}
                          onChange={(explanation) => update({ explanation })}
                          placeholder="해설 (선택)"
                          disabled={pending}
                        />
                      </div>
                    )}
                  />
                </Labeled>
              ) : null}

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
                  <span
                    style={{ alignSelf: "center", fontSize: 11, color: "var(--ink-3)" }}
                  >
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
