"use client";

import {
  ChevronRight,
  File,
  FileText,
  Folder,
  MessageCircle,
  ShieldAlert,
  Star,
} from "lucide-react";
import { useWorkbench } from "@/lib/workbench-context";
import type { TreeNode } from "@/lib/types";
import { cn } from "@/lib/utils";

const INDENT_PX: Record<TreeNode["type"], number> = {
  chapter: 6,
  section: 18,
  item: 30,
};

const STATUS_DOT: Record<string, string> = {
  draft: "bg-ink-4",
  review: "bg-warn",
  approved: "bg-[oklch(0.55_0.13_240)]",
  published: "bg-ok",
};

export function TocTree({ nodes }: { nodes: TreeNode[] }) {
  return (
    <ul className="flex flex-col gap-px py-1">
      {nodes.map((n) => (
        <TocNode key={n.id} node={n} />
      ))}
    </ul>
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
  const indent = INDENT_PX[node.type];
  const isFav = favorites.includes(node.id);
  const mustRead = mustReadSet.has(node.id);
  const ackPending = mustRead && !acked.has(node.id);

  const Icon =
    node.type === "chapter" ? Folder : node.type === "section" ? File : FileText;

  return (
    <li>
      <div
        className={cn(
          "group flex cursor-pointer items-center gap-1.5 rounded-md py-1 pr-2 text-[12.5px] text-ink-2 hover:bg-surface-3",
          isActive && "bg-accent-soft text-accent hover:bg-accent-soft",
          node.type === "chapter" && "font-semibold text-ink",
        )}
        style={{ paddingLeft: indent }}
        onClick={() => setActiveId(node.id)}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleOpen(node.id);
            }}
            className="grid h-4 w-4 place-items-center rounded text-ink-3 hover:text-ink"
            aria-label="toggle"
          >
            <ChevronRight
              size={12}
              className={cn("transition-transform", node.open && "rotate-90")}
            />
          </button>
        ) : (
          <span className="w-4" />
        )}
        <Icon size={12} className="shrink-0 text-ink-3" />
        <span className="flex-1 truncate">{label}</span>
        {isFav && <Star size={10} className="shrink-0 fill-warn text-warn" />}
        {ackPending && (
          <ShieldAlert
            size={10}
            className="shrink-0 text-warn"
            aria-label="필독 미확인"
          />
        )}
        {node.badge === "PDF" && (
          <span className="rounded bg-accent-softer px-1 py-px font-en text-[9.5px] font-bold text-accent">
            PDF
          </span>
        )}
        {node.hasComments ? (
          <span className="flex items-center gap-0.5 text-[10.5px] text-ink-3">
            <MessageCircle size={10} /> {node.hasComments}
          </span>
        ) : null}
        {node.status && (
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              STATUS_DOT[node.status] ?? "bg-ink-4",
            )}
            title={node.status}
          />
        )}
      </div>
      {hasChildren && node.open && <TocTree nodes={node.children!} />}
    </li>
  );
}
