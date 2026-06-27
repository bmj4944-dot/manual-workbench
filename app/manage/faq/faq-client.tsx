"use client";

import { useState, useTransition } from "react";
import { deleteFaqAction, saveFaqAction } from "@/lib/actions/faqs";
import { toast, toastErrorMessage } from "@/lib/toast";
import type { ManageFaq } from "@/lib/data/faqs";
import type { TreeNode } from "@/lib/types";
import {
  ConsoleHeader,
  DangerButton,
  DocSelect,
  DynamicList,
  EmptyState,
  Labeled,
  MasterDetailGrid,
  NumberInput,
  panelStyle,
  PrimaryButton,
  TagInput,
  TextArea,
  TextInput,
} from "../_widgets";

type DraftSource = { documentId: string; confidence: number; snippet: string };

type Draft = {
  id: string | null;
  question: string;
  answer: string;
  confidence: number;
  tags: string[];
  askedCount: number;
  sortOrder: number;
  sources: DraftSource[];
};

function emptyDraft(nextSort: number): Draft {
  return {
    id: null,
    question: "",
    answer: "",
    confidence: 0.9,
    tags: [],
    askedCount: 0,
    sortOrder: nextSort,
    sources: [],
  };
}

function toDraft(f: ManageFaq): Draft {
  return {
    id: f.id,
    question: f.question,
    answer: f.answer,
    confidence: f.confidence,
    tags: [...f.tags],
    askedCount: f.askedCount,
    sortOrder: f.sortOrder,
    sources: f.sources.map((s) => ({
      documentId: s.documentId ?? "",
      confidence: s.confidence,
      snippet: s.snippet,
    })),
  };
}

function confColor(c: number): string {
  if (c >= 0.85) return "oklch(0.62 0.15 150)";
  if (c >= 0.6) return "oklch(0.68 0.13 80)";
  return "oklch(0.62 0.18 25)";
}

export function FaqClient({
  faqs,
  tree,
}: {
  faqs: ManageFaq[];
  tree: TreeNode[];
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pending, startTransition] = useTransition();

  const patch = (p: Partial<Draft>) =>
    setDraft((d) => (d ? { ...d, ...p } : d));

  const nextSort = faqs.reduce((m, f) => Math.max(m, f.sortOrder + 1), 0);

  const save = () => {
    if (!draft) return;
    startTransition(async () => {
      try {
        const res = await saveFaqAction({
          id: draft.id,
          question: draft.question,
          answer: draft.answer,
          confidence: draft.confidence,
          tags: draft.tags,
          askedCount: draft.askedCount,
          sortOrder: draft.sortOrder,
          sources: draft.sources.map((s) => ({
            documentId: s.documentId || null,
            confidence: s.confidence,
            snippet: s.snippet,
          })),
        });
        if (res.ok) {
          toast.success("FAQ를 저장했습니다.");
          setDraft((d) => (d ? { ...d, id: res.data.id } : d));
        } else toast.error(res.reason);
      } catch (err) {
        console.error("saveFaqAction failed", err);
        toast.error(toastErrorMessage(err, "FAQ 저장에 실패했습니다."));
      }
    });
  };

  const remove = () => {
    if (!draft?.id) return;
    if (!window.confirm("이 FAQ를 삭제할까요? 되돌릴 수 없습니다.")) return;
    const id = draft.id;
    startTransition(async () => {
      try {
        const res = await deleteFaqAction(id);
        if (res.ok) {
          toast.success("FAQ를 삭제했습니다.");
          setDraft(null);
        } else toast.error(res.reason);
      } catch (err) {
        console.error("deleteFaqAction failed", err);
        toast.error(toastErrorMessage(err, "FAQ 삭제에 실패했습니다."));
      }
    });
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <ConsoleHeader
        count={faqs.length}
        noun="FAQ"
        onNew={() => setDraft(emptyDraft(nextSort))}
        newLabel="+ 새 FAQ"
      />

      <MasterDetailGrid>
        {/* 목록 */}
        <div style={{ ...panelStyle, overflow: "hidden" }}>
          {faqs.length === 0 ? (
            <EmptyState>등록된 FAQ가 없습니다.</EmptyState>
          ) : (
            faqs.map((f) => {
              const active = draft?.id === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setDraft(toDraft(f))}
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
                      fontSize: 13,
                      color: "var(--ink)",
                      fontWeight: active ? 600 : 400,
                      marginBottom: 4,
                    }}
                  >
                    {f.question || "(질문 없음)"}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 10.5,
                      color: "var(--ink-3)",
                    }}
                  >
                    <span style={{ color: confColor(f.confidence), fontWeight: 700 }}>
                      {Math.round(f.confidence * 100)}%
                    </span>
                    <span>·</span>
                    <span>{f.askedCount}회 질문</span>
                    {f.tags.length ? <span>· {f.tags.join(", ")}</span> : null}
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
              왼쪽에서 FAQ를 선택하거나 “+ 새 FAQ”로 추가하세요.
            </EmptyState>
          ) : (
            <>
              <Labeled label="질문">
                <TextArea
                  value={draft.question}
                  onChange={(v) => patch({ question: v })}
                  placeholder="고객이 자주 묻는 질문"
                  disabled={pending}
                  rows={2}
                />
              </Labeled>
              <Labeled label="답변">
                <TextArea
                  value={draft.answer}
                  onChange={(v) => patch({ answer: v })}
                  placeholder="표준 응대 답변"
                  disabled={pending}
                  rows={4}
                />
              </Labeled>

              <div
                style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}
              >
                <Labeled label="신뢰도" hint="0–1">
                  <NumberInput
                    value={draft.confidence}
                    onChange={(v) => patch({ confidence: v })}
                    min={0}
                    max={1}
                    step={0.01}
                    disabled={pending}
                  />
                </Labeled>
                <Labeled label="질문 횟수">
                  <NumberInput
                    value={draft.askedCount}
                    onChange={(v) => patch({ askedCount: v })}
                    min={0}
                    step={1}
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

              <Labeled label="태그">
                <TagInput
                  value={draft.tags}
                  onChange={(tags) => patch({ tags })}
                  disabled={pending}
                />
              </Labeled>

              <Labeled label="출처" hint="답변 근거가 되는 매뉴얼 문서">
                <DynamicList
                  items={draft.sources}
                  onChange={(sources) => patch({ sources })}
                  empty={() => ({ documentId: "", confidence: 0.8, snippet: "" })}
                  addLabel="+ 출처 추가"
                  renderRow={(src, update) => (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <DocSelect
                        value={src.documentId}
                        onChange={(documentId) => update({ documentId })}
                        tree={tree}
                        emptyLabel="— 문서 미연결 —"
                        disabled={pending}
                      />
                      <div style={{ display: "flex", gap: 6 }}>
                        <div style={{ width: 110 }}>
                          <NumberInput
                            value={src.confidence}
                            onChange={(confidence) => update({ confidence })}
                            min={0}
                            max={1}
                            step={0.01}
                            disabled={pending}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <TextInput
                            value={src.snippet}
                            onChange={(snippet) => update({ snippet })}
                            placeholder="인용 스니펫"
                            disabled={pending}
                          />
                        </div>
                      </div>
                    </div>
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
              </div>
            </>
          )}
        </div>
      </MasterDetailGrid>
    </div>
  );
}
