"use client";

import { Plus, RotateCw, Search, Sparkles, Star, X } from "lucide-react";
import { useMemo, useState } from "react";
import { findNode, useWorkbench } from "@/lib/workbench-context";
import { t } from "@/lib/i18n";
import { TocTree } from "@/components/toc/toc-tree";
import type { TreeNode } from "@/lib/types";

function countLeaves(nodes: TreeNode[]): number {
  let n = 0;
  for (const node of nodes) {
    if (node.type === "item") n += 1;
    if (node.children) n += countLeaves(node.children);
  }
  return n;
}

function filterTree(nodes: TreeNode[], q: string): TreeNode[] {
  if (!q.trim()) return nodes;
  const lq = q.toLowerCase();
  const out: TreeNode[] = [];
  for (const n of nodes) {
    const labelHit =
      n.label.toLowerCase().includes(lq) ||
      (n.labelEn ?? "").toLowerCase().includes(lq);
    const kids = n.children ? filterTree(n.children, q) : undefined;
    if (labelHit || (kids && kids.length)) {
      out.push({ ...n, open: true, children: kids ?? n.children });
    }
  }
  return out;
}

export function Sidebar() {
  const {
    tree,
    locale,
    favorites,
    setActiveId,
    whatsNewRead,
    markWhatsNewRead,
    whatsNew,
  } = useWorkbench();
  const [q, setQ] = useState("");
  const [whatsNewCollapsed, setWhatsNewCollapsed] = useState(false);
  const filtered = useMemo(() => filterTree(tree, q), [tree, q]);
  const total = useMemo(() => countLeaves(tree), [tree]);
  const unread = whatsNew.filter((w) => !whatsNewRead.has(w.id));

  return (
    <aside className="sidebar">
      <div className="sb-hd">
        <span className="ttl">{t(locale, "tocTitle")}</span>
        <div className="actions">
          <button type="button" aria-label={t(locale, "addChapter")} title="새 챕터">
            <Plus size={13} />
          </button>
          <button type="button" aria-label="새로고침" title="새로고침">
            <RotateCw size={12} />
          </button>
        </div>
      </div>

      <div className="sb-search">
        <Search size={12} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t(locale, "tocSearch")}
        />
      </div>

      {!whatsNewCollapsed && unread.length > 0 && (
        <div className="whats-new">
          <div className="wn-hd">
            <span className="wn-ttl">
              <Sparkles size={10} /> WHAT&apos;S NEW
              <span
                style={{
                  background: "var(--accent)",
                  color: "white",
                  fontFamily: "var(--font-en)",
                  fontSize: 9,
                  padding: "0 5px",
                  borderRadius: 999,
                  marginLeft: 4,
                }}
              >
                {unread.length}
              </span>
            </span>
            <button
              type="button"
              className="wn-close"
              onClick={() => setWhatsNewCollapsed(true)}
              aria-label="close"
            >
              <X size={10} />
            </button>
          </div>
          {whatsNew.slice(0, 4).map((w) => {
            const node = findNode(tree, w.id);
            const read = whatsNewRead.has(w.id);
            return (
              <div
                key={w.id}
                className={`wn-item${read ? " read" : ""}`}
                onClick={() => {
                  markWhatsNewRead(w.id);
                  setActiveId(w.id);
                }}
              >
                <span className="dot" />
                <span className="lbl">
                  {node
                    ? locale === "ko"
                      ? node.label
                      : node.labelEn ?? node.label
                    : w.what}
                </span>
                <span className="when">{w.when}</span>
              </div>
            );
          })}
        </div>
      )}

      {favorites.length > 0 && (
        <div className="sb-favs">
          <div className="sf-hd">
            <span>
              <Star size={10} style={{ display: "inline", color: "var(--accent)", marginRight: 4 }} />
              즐겨찾기
            </span>
            <span className="ct">{favorites.length}</span>
          </div>
          {favorites.map((id) => {
            const n = findNode(tree, id);
            if (!n) return null;
            const label = locale === "ko" ? n.label : n.labelEn ?? n.label;
            return (
              <div
                key={id}
                className="sf-item"
                onClick={() => setActiveId(id)}
              >
                <Star size={11} className="star" />
                <span className="lbl">{label}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="toc">
        <TocTree nodes={filtered} />
      </div>

      <button type="button" className="sb-add">
        <Plus size={12} />
        <span>새 장 추가</span>
      </button>

      <div className="sb-footer">
        <span>
          {locale === "ko" ? "목차" : "Items"} {total}
          {locale === "ko" ? "개 항목" : ""}
        </span>
        <span className="stat">{favorites.length}★</span>
      </div>
    </aside>
  );
}
