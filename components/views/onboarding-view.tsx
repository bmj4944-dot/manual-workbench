"use client";

import { useMemo, useState } from "react";
import {
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  Sparkles,
  Target,
} from "lucide-react";
import { findNode, useWorkbench } from "@/lib/workbench-context";
import type { OnboardingQuestion, OnboardingTask } from "@/lib/types";
import { cn } from "@/lib/utils";

const TYPE_META: Record<OnboardingTask["type"], { icon: typeof BookOpen; ko: string }> = {
  read: { icon: BookOpen, ko: "필독" },
  quiz: { icon: Sparkles, ko: "퀴즈" },
  practice: { icon: Target, ko: "실습" },
};

export function OnboardingView() {
  const { onboardingDone, tree, setActiveId, onboardingTasks } = useWorkbench();
  const [openId, setOpenId] = useState<string | null>(onboardingTasks[0]?.id ?? null);

  const total = onboardingTasks.length;
  const done = onboardingTasks.filter((t) => onboardingDone.has(t.id)).length;
  const pct = Math.round((done / total) * 100);
  const allDone = done === total;

  return (
    <main className="min-h-0 overflow-y-auto bg-surface">
      <div className="mx-auto max-w-[920px] px-10 py-8">
        <header className="mb-6 rounded-[var(--radius-lg)] border border-line bg-panel p-5">
          <div className="mb-1 flex items-center gap-2">
            <GraduationCap size={18} className="text-accent" />
            <h1 className="text-[22px] font-bold tracking-tighter2 text-ink">
              신입 상담사 온보딩
            </h1>
            <span
              className={cn(
                "ml-2 rounded-full px-2 py-0.5 text-[11px] font-medium",
                allDone
                  ? "bg-ok/15 text-ok"
                  : "bg-accent-soft text-accent",
              )}
            >
              {pct}%
            </span>
          </div>
          <p className="mb-3 text-[13px] text-ink-3">
            필독·퀴즈·실습을 모두 완료하면 정식 응대를 시작할 수 있습니다.
          </p>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <div
              className={cn(
                "h-full transition-all",
                allDone ? "bg-ok" : "bg-accent",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between font-mono text-[11px] text-ink-3">
            <span>완료 {done}/{total}</span>
            <span>남음 {total - done}</span>
          </div>
        </header>

        {allDone && (
          <div className="mb-6 rounded-[var(--radius-lg)] border border-ok/40 bg-[oklch(0.92_0.06_145_/_0.4)] p-5 text-center">
            <div className="mb-2 text-[28px]">🎓</div>
            <div className="text-[16px] font-semibold text-[oklch(0.38_0.13_145)]">
              모든 단계를 완료했습니다!
            </div>
            <p className="mt-1 text-[12.5px] text-[oklch(0.38_0.13_145)]/80">
              팀 매니저에게 알림이 발송되며, 정식 응대 권한이 활성화됩니다.
            </p>
          </div>
        )}

        <ul className="flex flex-col gap-2">
          {onboardingTasks.map((task, i) => {
            const isOpen = openId === task.id;
            const isDone = onboardingDone.has(task.id);
            const Meta = TYPE_META[task.type];
            const node = task.sectionId ? findNode(tree, task.sectionId) : null;
            return (
              <li
                key={task.id}
                className={cn(
                  "rounded-[var(--radius-lg)] border bg-panel",
                  isDone ? "border-ok/40 bg-ok/5" : "border-line",
                )}
              >
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : task.id)}
                  className="flex w-full items-start gap-3 p-4 text-left"
                >
                  <span
                    className={cn(
                      "mt-0.5 grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold",
                      isDone
                        ? "bg-ok text-white"
                        : "bg-surface-2 text-ink-3",
                    )}
                  >
                    {isDone ? <Check size={14} /> : i + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[10.5px] font-medium",
                          task.type === "read" && "bg-accent-softer text-accent",
                          task.type === "quiz" && "bg-warn/15 text-warn",
                          task.type === "practice" && "bg-[oklch(0.92_0.06_145)] text-[oklch(0.38_0.13_145)]",
                        )}
                      >
                        <Meta.icon size={10} className="-mt-px mr-1 inline" />
                        {Meta.ko}
                      </span>
                      <h3 className="text-[14px] font-semibold text-ink">
                        {task.title}
                      </h3>
                      {task.estimate && (
                        <span className="font-mono text-[10.5px] text-ink-3">
                          {task.estimate}
                        </span>
                      )}
                    </div>
                    {task.desc && (
                      <p className="mt-0.5 text-[12.5px] text-ink-3">
                        {task.desc}
                      </p>
                    )}
                  </div>
                  {isOpen ? (
                    <ChevronDown size={16} className="text-ink-3" />
                  ) : (
                    <ChevronRight size={16} className="text-ink-3" />
                  )}
                </button>

                {isOpen && (
                  <div className="border-t border-line px-4 py-4">
                    {task.type === "read" && (
                      <ReadStep
                        task={task}
                        sectionLabel={node?.label}
                        onJump={() => task.sectionId && setActiveId(task.sectionId)}
                      />
                    )}
                    {task.type === "quiz" && <QuizStep task={task} />}
                    {task.type === "practice" && (
                      <PracticeStep
                        task={task}
                        sectionLabel={node?.label}
                        onJump={() => task.sectionId && setActiveId(task.sectionId)}
                      />
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}

function ReadStep({
  task,
  sectionLabel,
  onJump,
}: {
  task: OnboardingTask;
  sectionLabel?: string;
  onJump: () => void;
}) {
  const { onboardingDone, completeStep } = useWorkbench();
  const done = onboardingDone.has(task.id);
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-[12.5px] text-ink-2">
        {sectionLabel ? (
          <>
            매뉴얼{" "}
            <button
              type="button"
              onClick={onJump}
              className="font-medium text-accent hover:underline"
            >
              {sectionLabel}
            </button>{" "}
            을 정독한 뒤 완료 표시하세요.
          </>
        ) : (
          "해당 항목을 정독한 뒤 완료 표시하세요."
        )}
      </div>
      <button
        type="button"
        onClick={() => completeStep(task.id)}
        className={cn(
          "shrink-0 rounded-md px-3 py-1 text-[12.5px] font-medium",
          done
            ? "border border-ok/40 bg-ok/15 text-ok"
            : "bg-accent text-white hover:opacity-90",
        )}
      >
        {done ? (
          <span className="flex items-center gap-1">
            <CheckCircle2 size={12} /> 완료됨
          </span>
        ) : (
          "완료 표시"
        )}
      </button>
    </div>
  );
}

function PracticeStep({
  task,
  sectionLabel,
  onJump,
}: {
  task: OnboardingTask;
  sectionLabel?: string;
  onJump: () => void;
}) {
  const { onboardingDone, completeStep } = useWorkbench();
  const done = onboardingDone.has(task.id);
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-[12.5px] text-ink-2">
        {sectionLabel ? (
          <>
            매뉴얼{" "}
            <button
              type="button"
              onClick={onJump}
              className="font-medium text-accent hover:underline"
            >
              {sectionLabel}
            </button>{" "}
            의 인터랙티브 가이드를 끝까지 진행해보세요.
          </>
        ) : (
          "실습을 진행한 뒤 완료 표시하세요."
        )}
      </div>
      <button
        type="button"
        onClick={() => completeStep(task.id)}
        className={cn(
          "shrink-0 rounded-md px-3 py-1 text-[12.5px] font-medium",
          done
            ? "border border-ok/40 bg-ok/15 text-ok"
            : "bg-accent text-white hover:opacity-90",
        )}
      >
        {done ? "완료됨" : "완료 표시"}
      </button>
    </div>
  );
}

function QuizStep({ task }: { task: OnboardingTask }) {
  const { quizAnswers, recordQuizAnswer, completeStep, onboardingDone } =
    useWorkbench();
  const answers = quizAnswers[task.id] ?? {};
  const qs = task.questions ?? [];
  const answered = Object.keys(answers).length;
  const correct = useMemo(
    () =>
      qs.reduce((s, q, i) => (answers[i] === q.correct ? s + 1 : s), 0),
    [qs, answers],
  );
  const isDone = onboardingDone.has(task.id);
  const pct = qs.length === 0 ? 0 : Math.round((correct / qs.length) * 100);
  const passed = pct >= 70;

  return (
    <>
      <div className="mb-3 flex items-center gap-2 text-[12px] text-ink-3">
        <span>
          {answered}/{qs.length} 답변
        </span>
        <span>·</span>
        <span>
          정답 {correct} ({pct}%) — 합격 기준 70%
        </span>
        {answered === qs.length && (
          <button
            type="button"
            onClick={() => !isDone && passed && completeStep(task.id)}
            disabled={!passed || isDone}
            className={cn(
              "ml-auto rounded-md px-2.5 py-0.5 text-[11.5px] font-medium",
              isDone
                ? "border border-ok/40 bg-ok/15 text-ok"
                : passed
                ? "bg-accent text-white hover:opacity-90"
                : "cursor-not-allowed bg-surface-2 text-ink-3",
            )}
          >
            {isDone ? "통과" : passed ? "단계 완료" : "재시도 필요"}
          </button>
        )}
      </div>
      <ol className="flex flex-col gap-3">
        {qs.map((q, i) => (
          <QuizQuestion
            key={i}
            q={q}
            index={i}
            answer={answers[i]}
            onAnswer={(opt) => recordQuizAnswer(task.id, i, opt)}
          />
        ))}
      </ol>
    </>
  );
}

function QuizQuestion({
  q,
  index,
  answer,
  onAnswer,
}: {
  q: OnboardingQuestion;
  index: number;
  answer: number | undefined;
  onAnswer: (opt: number) => void;
}) {
  const answered = typeof answer === "number";
  return (
    <li className="rounded-[var(--radius)] border border-line bg-surface-2 p-3">
      <div className="mb-2 text-[12.5px] font-medium text-ink">
        Q{index + 1}. {q.q}
      </div>
      <div className="flex flex-col gap-1">
        {q.opts.map((opt, i) => {
          const picked = answer === i;
          const isCorrect = answered && i === q.correct;
          const isWrong = answered && picked && i !== q.correct;
          return (
            <button
              key={i}
              type="button"
              onClick={() => !answered && onAnswer(i)}
              disabled={answered}
              className={cn(
                "flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-left text-[12.5px]",
                !answered &&
                  "border-line bg-panel text-ink-2 hover:border-accent hover:text-ink",
                isCorrect &&
                  "border-ok/40 bg-ok/15 text-ok",
                isWrong &&
                  "border-[oklch(0.80_0.18_28_/_0.5)] bg-[oklch(0.95_0.06_28_/_0.4)] text-[oklch(0.45_0.18_28)]",
                answered &&
                  !picked &&
                  !isCorrect &&
                  "border-line bg-surface-3 text-ink-3",
              )}
            >
              <span
                className={cn(
                  "grid h-4 w-4 place-items-center rounded-full border text-[10px] font-mono",
                  picked
                    ? "border-current bg-current text-white"
                    : "border-line",
                )}
              >
                {String.fromCharCode(65 + i)}
              </span>
              <span className="flex-1">{opt}</span>
              {isCorrect && <Check size={12} />}
            </button>
          );
        })}
      </div>
      {answered && (
        <p className="mt-2 rounded-md bg-panel px-3 py-2 text-[11.5px] text-ink-2">
          <strong>해설.</strong> {q.explain}
        </p>
      )}
    </li>
  );
}
