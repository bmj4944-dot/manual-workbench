"use client";

import {
  type CSSProperties,
  type ReactNode,
  useId,
  useState,
} from "react";
import type { TreeNode } from "@/lib/types";

// ─────────────────────────────────────────────────────────────
// 콘텐츠 관리 콘솔 공용 위젯. /admin/teams 의 인라인 스타일 + CSS 변수
// 컨벤션을 따르되, 사례·FAQ·온보딩 폼이 공유하는 입력 요소를 모아 중복을 줄인다.
// ─────────────────────────────────────────────────────────────

export const fieldStyle: CSSProperties = {
  width: "100%",
  padding: "7px 10px",
  borderRadius: 6,
  border: "1px solid var(--line)",
  background: "var(--panel)",
  color: "var(--ink)",
  fontSize: 13,
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

export const panelStyle: CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: 8,
  background: "var(--panel)",
};

// ── 레이아웃 ──────────────────────────────────────────────────

export function MasterDetailGrid({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(240px, 1fr) minmax(360px, 1.8fr)",
        gap: 16,
        alignItems: "start",
      }}
    >
      {children}
    </div>
  );
}

export function ConsoleHeader({
  count,
  noun,
  onNew,
  newLabel,
}: {
  count: number;
  noun: string;
  onNew: () => void;
  newLabel: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 16,
      }}
    >
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
        {noun} {count}개
      </h2>
      <span style={{ flex: 1 }} />
      <PrimaryButton onClick={onNew}>{newLabel}</PrimaryButton>
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        padding: 28,
        textAlign: "center",
        color: "var(--ink-3)",
        fontSize: 13,
      }}
    >
      {children}
    </div>
  );
}

// ── 폼 요소 ──────────────────────────────────────────────────

export function Labeled({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label style={{ display: "block", marginBottom: 12 }}>
      <span
        style={{
          display: "block",
          fontSize: 11.5,
          fontWeight: 600,
          color: "var(--ink-2)",
          marginBottom: 5,
        }}
      >
        {label}
        {hint ? (
          <span style={{ fontWeight: 400, color: "var(--ink-3)" }}>
            {" "}
            · {hint}
          </span>
        ) : null}
      </span>
      {children}
    </label>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      style={fieldStyle}
    />
  );
}

export function TextArea({
  value,
  onChange,
  placeholder,
  disabled,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      rows={rows}
      style={{ ...fieldStyle, resize: "vertical", lineHeight: 1.5 }}
    />
  );
}

export function NumberInput({
  value,
  onChange,
  min,
  max,
  step,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}) {
  return (
    <input
      type="number"
      value={Number.isFinite(value) ? value : 0}
      onChange={(e) => onChange(Number(e.target.value))}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      style={fieldStyle}
    />
  );
}

export function Select({
  value,
  onChange,
  options,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      style={{ ...fieldStyle, cursor: disabled ? "not-allowed" : "pointer" }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// ── 버튼 ─────────────────────────────────────────────────────

const baseBtn: CSSProperties = {
  padding: "7px 14px",
  borderRadius: 6,
  border: 0,
  fontSize: 12.5,
  fontWeight: 600,
  fontFamily: "inherit",
};

export function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        ...baseBtn,
        background: "var(--accent)",
        color: "white",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        ...baseBtn,
        background: "var(--panel)",
        border: "1px solid var(--line)",
        color: "var(--ink-2)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  );
}

export function DangerButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        ...baseBtn,
        background: "transparent",
        border: "1px solid var(--danger, oklch(0.62 0.18 25))",
        color: "var(--danger, oklch(0.62 0.18 25))",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  );
}

// ── 문서 선택 (트리 평탄화) ──────────────────────────────────

export function flattenTree(
  nodes: TreeNode[],
  depth = 0,
): { id: string; label: string; depth: number }[] {
  const out: { id: string; label: string; depth: number }[] = [];
  for (const n of nodes) {
    out.push({ id: n.id, label: n.label, depth });
    if (n.children?.length) out.push(...flattenTree(n.children, depth + 1));
  }
  return out;
}

export function DocSelect({
  value,
  onChange,
  tree,
  emptyLabel = "— 연결 없음 —",
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  tree: TreeNode[];
  emptyLabel?: string;
  disabled?: boolean;
}) {
  const flat = flattenTree(tree);
  return (
    <Select
      value={value}
      onChange={onChange}
      disabled={disabled}
      options={[
        { value: "", label: emptyLabel },
        ...flat.map((f) => ({
          value: f.id,
          label: `${"  ".repeat(f.depth)}${f.label}`,
        })),
      ]}
    />
  );
}

// ── 태그 칩 입력 ─────────────────────────────────────────────

export function TagInput({
  value,
  onChange,
  disabled,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const inputId = useId();

  const add = () => {
    const t = draft.trim();
    if (!t || value.includes(t)) {
      setDraft("");
      return;
    }
    onChange([...value, t]);
    setDraft("");
  };

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 6,
        alignItems: "center",
        padding: "6px 8px",
        ...panelStyle,
      }}
    >
      {value.map((tag) => (
        <span
          key={tag}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "2px 6px",
            borderRadius: 4,
            background: "var(--surface-2, var(--surface))",
            border: "1px solid var(--line)",
            fontSize: 11.5,
            color: "var(--ink-2)",
          }}
        >
          {tag}
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange(value.filter((t) => t !== tag))}
              style={{
                border: 0,
                background: "transparent",
                color: "var(--ink-3)",
                cursor: "pointer",
                padding: 0,
                fontSize: 12,
                lineHeight: 1,
              }}
              aria-label={`${tag} 제거`}
            >
              ×
            </button>
          )}
        </span>
      ))}
      <input
        id={inputId}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          } else if (e.key === "Backspace" && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={add}
        placeholder={disabled ? "" : "태그 입력 후 Enter"}
        disabled={disabled}
        style={{
          flex: 1,
          minWidth: 120,
          border: 0,
          outline: "none",
          background: "transparent",
          color: "var(--ink)",
          fontSize: 12.5,
          fontFamily: "inherit",
        }}
      />
    </div>
  );
}

// ── 동적 행 리스트 (추가/삭제/순서) ──────────────────────────

export function DynamicList<T>({
  items,
  onChange,
  empty,
  addLabel,
  renderRow,
}: {
  items: T[];
  onChange: (next: T[]) => void;
  empty: () => T;
  addLabel: string;
  renderRow: (
    item: T,
    update: (patch: Partial<T>) => void,
    index: number,
  ) => ReactNode;
}) {
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    onChange(next);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            gap: 8,
            alignItems: "flex-start",
            padding: 8,
            ...panelStyle,
          }}
        >
          <div style={{ flex: 1 }}>
            {renderRow(
              item,
              (patch) =>
                onChange(
                  items.map((it, j) => (j === i ? { ...it, ...patch } : it)),
                ),
              i,
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <RowIconButton onClick={() => move(i, i - 1)} label="위로">
              ↑
            </RowIconButton>
            <RowIconButton onClick={() => move(i, i + 1)} label="아래로">
              ↓
            </RowIconButton>
            <RowIconButton
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              label="삭제"
              danger
            >
              ×
            </RowIconButton>
          </div>
        </div>
      ))}
      <GhostButton onClick={() => onChange([...items, empty()])}>
        {addLabel}
      </GhostButton>
    </div>
  );
}

function RowIconButton({
  children,
  onClick,
  label,
  danger,
}: {
  children: ReactNode;
  onClick: () => void;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      style={{
        width: 22,
        height: 20,
        borderRadius: 4,
        border: "1px solid var(--line)",
        background: "var(--panel)",
        color: danger ? "var(--danger, oklch(0.62 0.18 25))" : "var(--ink-3)",
        cursor: "pointer",
        fontSize: 12,
        lineHeight: 1,
        padding: 0,
      }}
    >
      {children}
    </button>
  );
}
