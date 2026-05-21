"use client";

import {
  BookOpen,
  ChevronRight,
  File as FileIcon,
  FileText,
  MessageCircle,
  MoreHorizontal,
  ShieldAlert,
  Star,
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

export function TocTree({ nodes }: { nodes: TreeNode[] }) {
  return (
    <>
      {nodes.map((n) => (
        <TocNode key={n.id} node={n} />
      ))}
    </>
  );
}

function TocNode({ node }: { node: TreeNode }) {
  const {
    activeId,
    setActiveId,
    toggleOpen,
    locale,
    favorites,
    acked,
    mustRead: mustReadSet,
  } = useWorkbench();
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
      <div className="row" onClick={() => setActiveId(node.id)}>
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
        <div className="label">{label}</div>
        {isFav && (
          <Star size={10} className="shrink-0" style={{ color: "var(--accent)", fill: "currentColor" }} />
        )}
        {ackPending && (
          <ShieldAlert size={10} className="shrink-0" style={{ color: "var(--warn)" }} />
        )}
        {node.badge === "PDF" && <span className="badge pdf">PDF</span>}
        {node.hasComments ? (
          <span className="badge" style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
            <MessageCircle size={9} />
            {node.hasComments}
          </span>
        ) : null}
        {node.status && (
          <span
            className="status-dot"
            style={{ background: STATUS_COLOR[node.status] ?? "var(--ink-4)" }}
            title={node.status}
          />
        )}
        <button type="button" className="menu" onClick={(e) => e.stopPropagation()}>
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
