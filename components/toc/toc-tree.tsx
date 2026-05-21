"use client";

import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  File as FileIcon,
  FileText,
  Layers,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  ShieldAlert,
  Star,
  X,
} from "lucide-react";
import { useWorkbench } from "@/lib/workbench-context";
import type { TreeNode } from "@/lib/types";
import { cn } from "@/lib/utils";

const LEVEL_OF: Record<TreeNode["type"], 1 | 2 | 3> = {
  chapter: 1,
  section: 2,
  item: 3,
};

const STATUS_COLOR: Record<string, string> = {
  draft: "var(--ink-4)",
  review: "var(--warn)",
  approved: "oklch(0.55 0.13 240)",
  published: "var(--ok)",
};

type MenuState = {
  x: number;
  y: number;
  node: TreeNode;
  startEdit: () => void;
};

export function TocTree({ nodes }: { nodes: TreeNode[] }) {
  const [menu, setMenu] = useState<MenuState | null>(null);
  return (
    <>
      {nodes.map((n) => (
        <TocNode key={n.id} node={n} setMenu={setMenu} />
      ))}
      {menu && <ContextMenu menu={menu} onClose={() => setMenu(null)} />}
    </>
  );
}

function TocNode({
  node,
  setMenu,
}: {
  node: TreeNode;
  setMenu: (m: MenuState | null) => void;
}) {
  const {
    activeId,
    setActiveId,
    toggleOpen,
    locale,
    favorites,
    acked,
    mustRead: mustReadSet,
    renameTreeNode,
  } = useWorkbench();
  const [editing, setEditing] = useState(false);
  const editRef = useRef<HTMLDivElement>(null);
  const hasChildren = !!node.children?.length;
  const isActive = activeId === node.id;
  const label = locale === "ko" ? node.label : node.labelEn ?? node.label;
  const level = LEVEL_OF[node.type];
  const isFav = favorites.includes(node.id);
  const mustRead = mustReadSet.has(node.id);
  const ackPending = mustRead && !acked.has(node.id);

  const NodeIcon =
    node.type === "chapter"
      ? BookOpen
      : node.type === "section"
      ? FileIcon
      : node.badge === "PDF"
      ? FileText
      : FileText;

  // Focus and select all on edit start
  useEffect(() => {
    if (editing && editRef.current) {
      editRef.current.focus();
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(editRef.current);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [editing]);

  const finishEdit = () => {
    const v = editRef.current?.textContent?.trim() || node.label;
    setEditing(false);
    if (v !== node.label) renameTreeNode(node.id, v);
  };

  const onRowClick = (e: React.MouseEvent) => {
    if (editing) return;
    if (hasChildren && (e.target as HTMLElement).closest(".twist")) {
      toggleOpen(node.id);
      return;
    }
    setActiveId(node.id);
  };

  return (
    <div
      className={cn(
        "node",
        node.open && "open",
        isActive && "active",
        hasChildren && "has-children",
      )}
      data-level={level}
    >
      <div
        className="row"
        onClick={onRowClick}
        onDoubleClick={() => setEditing(true)}
        onContextMenu={(e) => {
          e.preventDefault();
          setMenu({
            x: e.clientX,
            y: e.clientY,
            node,
            startEdit: () => setEditing(true),
          });
        }}
      >
        <div
          className="twist"
          onClick={(e) => {
            if (hasChildren) {
              e.stopPropagation();
              toggleOpen(node.id);
            }
          }}
        >
          {hasChildren && <ChevronRight size={11} />}
        </div>
        <div className="ico">
          <NodeIcon size={level === 1 ? 13 : 12} />
        </div>
        {editing ? (
          <div
            ref={editRef}
            className="label"
            contentEditable
            suppressContentEditableWarning
            onBlur={finishEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                finishEdit();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setEditing(false);
              }
            }}
          >
            {label}
          </div>
        ) : (
          <div className="label">{label}</div>
        )}
        {isFav && (
          <Star
            size={10}
            className="shrink-0"
            style={{ color: "var(--accent)", fill: "currentColor" }}
          />
        )}
        {ackPending && (
          <ShieldAlert
            size={10}
            className="shrink-0"
            style={{ color: "var(--warn)" }}
          />
        )}
        {node.badge === "PDF" && <span className="badge pdf">PDF</span>}
        {node.hasComments ? (
          <span
            className="badge"
            style={{ display: "inline-flex", alignItems: "center", gap: 2 }}
          >
            <MessageCircle size={9} />
            {node.hasComments}
          </span>
        ) : null}
        {node.status && (
          <span
            className="status-dot"
            style={{
              background: STATUS_COLOR[node.status] ?? "var(--ink-4)",
            }}
            title={node.status}
          />
        )}
        <button
          type="button"
          className="menu"
          onClick={(e) => {
            e.stopPropagation();
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            setMenu({
              x: rect.right,
              y: rect.bottom + 4,
              node,
              startEdit: () => setEditing(true),
            });
          }}
        >
          <MoreHorizontal size={12} />
        </button>
      </div>
      {hasChildren && (
        <div className="kids">
          <TocTree nodes={node.children!} />
        </div>
      )}
    </div>
  );
}

function ContextMenu({
  menu,
  onClose,
}: {
  menu: MenuState;
  onClose: () => void;
}) {
  const {
    createTreeNode,
    addSibling,
    duplicateTreeNode,
    deleteTreeNode,
    moveTreeNode,
  } = useWorkbench();
  const { x, y, node, startEdit } = menu;

  useEffect(() => {
    const close = () => onClose();
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [onClose]);

  const childKind =
    node.type === "chapter"
      ? "section"
      : node.type === "section"
      ? "item"
      : null;
  const childLabel =
    node.type === "chapter" ? "절 추가" : node.type === "section" ? "항목 추가" : null;

  const siblingLabel =
    node.type === "chapter"
      ? "새 장 추가"
      : node.type === "section"
      ? "새 절 추가"
      : "새 항목 추가";

  const onDelete = () => {
    if (!confirm(`"${node.label}"을(를) 삭제할까요? 하위 항목도 함께 삭제됩니다.`))
      return;
    deleteTreeNode(node.id);
  };

  const items: Array<
    | "sep"
    | {
        icon: React.ReactNode;
        label: string;
        onClick: () => void;
        danger?: boolean;
      }
  > = [
    { icon: <Pencil size={12} />, label: "이름 변경", onClick: startEdit },
  ];
  if (childKind) {
    items.push({
      icon: <Plus size={12} />,
      label: childLabel!,
      onClick: () => createTreeNode(node.id, childKind),
    });
  }
  items.push({
    icon: <Plus size={12} />,
    label: siblingLabel,
    onClick: () => addSibling(node.id),
  });
  items.push({
    icon: <Layers size={12} />,
    label: "복제",
    onClick: () => duplicateTreeNode(node.id),
  });
  items.push("sep");
  items.push({
    icon: <ChevronUp size={12} />,
    label: "위로",
    onClick: () => moveTreeNode(node.id, -1),
  });
  items.push({
    icon: <ChevronDown size={12} />,
    label: "아래로",
    onClick: () => moveTreeNode(node.id, 1),
  });
  items.push("sep");
  items.push({
    icon: <X size={12} />,
    label: "삭제",
    onClick: onDelete,
    danger: true,
  });

  return (
    <div
      style={{
        position: "fixed",
        left: x,
        top: y,
        zIndex: 200,
        minWidth: 180,
        background: "var(--panel)",
        border: "1px solid var(--line)",
        borderRadius: 8,
        boxShadow: "var(--shadow-md)",
        padding: 4,
        fontSize: 12.5,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((it, i) =>
        it === "sep" ? (
          <div
            key={i}
            style={{
              height: 1,
              background: "var(--line)",
              margin: "4px 0",
            }}
          />
        ) : (
          <button
            key={i}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              it.onClick();
              onClose();
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 10px",
              border: 0,
              background: "transparent",
              borderRadius: 5,
              cursor: "pointer",
              color: it.danger ? "oklch(0.55 0.18 25)" : "var(--ink)",
              width: "100%",
              textAlign: "left",
              font: "inherit",
              fontSize: 12.5,
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.background =
                "var(--bg-3)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.background =
                "transparent")
            }
          >
            {it.icon}
            <span>{it.label}</span>
          </button>
        ),
      )}
    </div>
  );
}
