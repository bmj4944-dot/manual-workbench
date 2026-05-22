"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { EMBED_KEYS, hydrateBody } from "./body-hydration";
import { TableEditorOverlay } from "./table-overlay";
import { useWorkbench } from "@/lib/workbench-context";
import {
  createUploadSignedUrlAction,
  finalizeEditorImageAction,
} from "@/lib/actions/uploads";
import { recordPageStatAction } from "@/lib/actions/page-stats";
import { createClient as createBrowserSupabase } from "@/lib/supabase/client";
import { toast, toastErrorMessage } from "@/lib/toast";

// Throttle copy events per-document so a user rapidly copying multiple
// chunks doesn't inflate the counter linearly.
const COPY_THROTTLE_MS = 5_000;
const lastCopiedAt = new Map<string, number>();
import type { TeamMember } from "@/lib/types";

// ─── Inline SVG icons (matches design_handoff icons.jsx) ─────────────
const Ic = {
  undo: () => (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 7 6 4 3 1" />
      <path d="M3 7h6a3 3 0 0 1 3 3v0a3 3 0 0 1-3 3H5" />
    </svg>
  ),
  redo: () => (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="11 7 8 4 11 1" transform="scale(-1,1) translate(-14,0)" />
      <path d="M11 7H5a3 3 0 0 0-3 3v0a3 3 0 0 0 3 3h4" />
    </svg>
  ),
  bold: () => (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="currentColor">
      <path d="M3.5 2h4a2.5 2.5 0 0 1 1.7 4.4A2.7 2.7 0 0 1 8 12H3.5V2zm1.7 4h2.3a1 1 0 0 0 0-2H5.2v2zm0 4h2.7a1.2 1.2 0 0 0 0-2.4H5.2V10z" />
    </svg>
  ),
  italic: () => (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
      <line x1="9" y1="2.5" x2="5" y2="11.5" />
      <line x1="6" y1="2.5" x2="10" y2="2.5" />
      <line x1="4" y1="11.5" x2="8" y2="11.5" />
    </svg>
  ),
  underline: () => (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round">
      <path d="M3.5 2v5a3.5 3.5 0 0 0 7 0V2" />
      <line x1="2.5" y1="12" x2="11.5" y2="12" />
    </svg>
  ),
  strike: () => (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
      <line x1="2.5" y1="7" x2="11.5" y2="7" />
      <path d="M4 4.5C4 3 5.5 2.2 7 2.2c1.5 0 2.6.7 3 1.7M4.5 9.5c0 1.5 1.5 2.3 3 2.3 1.5 0 2.8-.8 2.5-2.3" />
    </svg>
  ),
  bullet: () => (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round">
      <circle cx="2.5" cy="3.5" r="0.8" fill="currentColor" />
      <circle cx="2.5" cy="7" r="0.8" fill="currentColor" />
      <circle cx="2.5" cy="10.5" r="0.8" fill="currentColor" />
      <line x1="5" y1="3.5" x2="12" y2="3.5" />
      <line x1="5" y1="7" x2="12" y2="7" />
      <line x1="5" y1="10.5" x2="12" y2="10.5" />
    </svg>
  ),
  ordered: () => (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round">
      <text x="1" y="5" fontSize="4.5" fill="currentColor" stroke="none" fontFamily="var(--font-en)">1</text>
      <text x="1" y="9" fontSize="4.5" fill="currentColor" stroke="none" fontFamily="var(--font-en)">2</text>
      <text x="1" y="13" fontSize="4.5" fill="currentColor" stroke="none" fontFamily="var(--font-en)">3</text>
      <line x1="5" y1="3.5" x2="12" y2="3.5" />
      <line x1="5" y1="7" x2="12" y2="7" />
      <line x1="5" y1="10.5" x2="12" y2="10.5" />
    </svg>
  ),
  checklist: () => (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="2" width="3" height="3" rx="0.5" />
      <polyline points="2 3.5 3 4.5 4 3" />
      <rect x="1.5" y="6" width="3" height="3" rx="0.5" />
      <rect x="1.5" y="10" width="3" height="3" rx="0.5" />
      <line x1="6" y1="3.5" x2="12" y2="3.5" />
      <line x1="6" y1="7.5" x2="12" y2="7.5" />
      <line x1="6" y1="11.5" x2="12" y2="11.5" />
    </svg>
  ),
  align_left: () => (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round">
      <line x1="2" y1="3" x2="12" y2="3" />
      <line x1="2" y1="7" x2="9" y2="7" />
      <line x1="2" y1="11" x2="11" y2="11" />
    </svg>
  ),
  align_center: () => (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round">
      <line x1="2" y1="3" x2="12" y2="3" />
      <line x1="3.5" y1="7" x2="10.5" y2="7" />
      <line x1="2.5" y1="11" x2="11.5" y2="11" />
    </svg>
  ),
  align_right: () => (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round">
      <line x1="2" y1="3" x2="12" y2="3" />
      <line x1="5" y1="7" x2="12" y2="7" />
      <line x1="3" y1="11" x2="12" y2="11" />
    </svg>
  ),
  table: () => (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2.5" width="10" height="9" rx="0.5" />
      <line x1="2" y1="5.5" x2="12" y2="5.5" />
      <line x1="2" y1="8.5" x2="12" y2="8.5" />
      <line x1="6" y1="2.5" x2="6" y2="11.5" />
      <line x1="9" y1="2.5" x2="9" y2="11.5" />
    </svg>
  ),
  image: () => (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="2.5" width="11" height="9" rx="1" />
      <circle cx="5" cy="6" r="1" />
      <polyline points="3 10 6 8 8 9 11 6 12.5 7.5" />
    </svg>
  ),
  callout: () => (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round">
      <circle cx="7" cy="7" r="5" />
      <line x1="7" y1="5" x2="7" y2="8" />
      <circle cx="7" cy="10" r="0.4" fill="currentColor" />
    </svg>
  ),
  code: () => (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4.5 4 1.5 7 4.5 10" />
      <polyline points="9.5 4 12.5 7 9.5 10" />
    </svg>
  ),
  divider: () => (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
      <line x1="2" y1="7" x2="12" y2="7" />
    </svg>
  ),
  link: () => (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4H4a3 3 0 0 0 0 6h2" />
      <path d="M8 10h2a3 3 0 0 0 0-6H8" />
      <line x1="5" y1="7" x2="9" y2="7" />
    </svg>
  ),
  search: () => (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="4" />
      <line x1="12" y1="12" x2="9" y2="9" />
    </svg>
  ),
  download: () => (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 9v2.5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V9" />
      <polyline points="4.5 5.5 7 8 9.5 5.5" />
      <line x1="7" y1="8" x2="7" y2="1.5" />
    </svg>
  ),
  print: () => (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 4 4 1.5 10 1.5 10 4" />
      <rect x="2" y="4" width="10" height="6" rx="1" />
      <rect x="4" y="8.5" width="6" height="4" />
    </svg>
  ),
  chev_up: () => (
    <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 9 7 5 11 9" />
    </svg>
  ),
  chev_down: () => (
    <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 5 7 9 11 5" />
    </svg>
  ),
  close: () => (
    <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
      <line x1="3.5" y1="3.5" x2="10.5" y2="10.5" />
      <line x1="10.5" y1="3.5" x2="3.5" y2="10.5" />
    </svg>
  ),
};

// ─── Color palettes (manual2) ────────────────────────────────────────
const TEXT_COLORS = [
  "#1a1a1a",
  "#d62828",
  "#e8821b",
  "#1b9e3d",
  "#2a6fdb",
  "#7a3aa0",
];
const HIGHLIGHT_COLORS = [
  "transparent",
  "#fff7a8",
  "#ffd2c0",
  "#c8efff",
  "#d8f1c8",
  "#f0d0ff",
];

// ─── Callout types (6 — extended from manual2 per screenshots) ──────
type CalloutKind = "info" | "success" | "warn" | "danger" | "tip" | "example";
const CALLOUT_META: Record<
  CalloutKind,
  { label: string; ico: string; cls: string }
> = {
  info:    { label: "정보", ico: "ⓘ", cls: "info" },
  success: { label: "성공", ico: "✓", cls: "success" },
  warn:    { label: "주의", ico: "⚠", cls: "warn" },
  danger:  { label: "위험", ico: "✕", cls: "danger" },
  tip:     { label: "팁",   ico: "💡", cls: "tip" },
  example: { label: "예시", ico: "✎", cls: "example" },
};

type Props = {
  content: string;
  editable?: boolean;
  onUpdate?: (html: string) => void;
  bottomSlot?: React.ReactNode;
};

type MentionState = {
  query: string;
  x: number;
  y: number;
  anchorNode: Text;
  startOffset: number;
  endOffset: number;
  activeIdx: number;
};

export function DocumentEditor({
  content,
  editable = true,
  onUpdate,
  bottomSlot,
}: Props) {
  const { members, activeId } = useWorkbench();
  const docRef = useRef<HTMLDivElement>(null);
  const [activeFormats, setActiveFormats] = useState<Record<string, boolean>>({});
  const [colorOpen, setColorOpen] = useState<null | "fg" | "bg">(null);
  const [calloutOpen, setCalloutOpen] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [findQ, setFindQ] = useState("");
  const [replaceQ, setReplaceQ] = useState("");
  const [hits, setHits] = useState(0);
  const [hitIdx, setHitIdx] = useState(0);
  const [mention, setMention] = useState<MentionState | null>(null);
  const mentionRef = useRef<MentionState | null>(null);
  mentionRef.current = mention;

  // Load content + hydrate widgets when activeId/content changes.
  useLayoutEffect(() => {
    if (docRef.current && docRef.current.innerHTML !== content) {
      docRef.current.innerHTML = content;
    }
    if (docRef.current) {
      const cleanup = hydrateBody(docRef.current);
      return cleanup;
    }
  }, [content]);

  // Active format detection
  useEffect(() => {
    if (!editable) return;
    const onSel = () => {
      try {
        setActiveFormats({
          bold: document.queryCommandState("bold"),
          italic: document.queryCommandState("italic"),
          underline: document.queryCommandState("underline"),
          strikeThrough: document.queryCommandState("strikeThrough"),
          insertUnorderedList: document.queryCommandState("insertUnorderedList"),
          insertOrderedList: document.queryCommandState("insertOrderedList"),
          justifyLeft: document.queryCommandState("justifyLeft"),
          justifyCenter: document.queryCommandState("justifyCenter"),
          justifyRight: document.queryCommandState("justifyRight"),
        });
      } catch {
        /* execCommand unavailable in some contexts */
      }
    };
    document.addEventListener("selectionchange", onSel);
    return () => document.removeEventListener("selectionchange", onSel);
  }, [editable]);

  // Detect @ mention pattern via selectionchange
  useEffect(() => {
    if (!editable) return;
    const onSel = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      if (!range.collapsed) return;
      if (!docRef.current?.contains(range.startContainer)) return;
      const node = range.startContainer;
      if (node.nodeType !== Node.TEXT_NODE) {
        setMention(null);
        return;
      }
      const text = (node.textContent ?? "").slice(0, range.startOffset);
      const m = text.match(/@(\S*)$/);
      if (!m) {
        setMention(null);
        return;
      }
      const query = m[1];
      const probe = document.createRange();
      probe.setStart(node, range.startOffset - m[0].length);
      probe.setEnd(node, range.startOffset);
      const rect = probe.getBoundingClientRect();
      setMention((prev) => ({
        query,
        x: rect.left,
        y: rect.bottom + 4,
        anchorNode: node as Text,
        startOffset: range.startOffset - m[0].length,
        endOffset: range.startOffset,
        activeIdx: 0,
        ...(prev?.query === query ? { activeIdx: prev.activeIdx } : {}),
      }));
    };
    document.addEventListener("selectionchange", onSel);
    return () => document.removeEventListener("selectionchange", onSel);
  }, [editable]);

  // Cmd+F → find bar
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setFindOpen(true);
        setTimeout(
          () =>
            (document.querySelector(
              ".find-bar input[data-fb='q']",
            ) as HTMLInputElement | null)?.focus(),
          50,
        );
      }
      if (e.key === "Escape") setFindOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── Editing helpers ─────────────────────────────────────────────
  const notifyChange = useCallback(() => {
    if (docRef.current) onUpdate?.(docRef.current.innerHTML);
  }, [onUpdate]);

  const exec = useCallback(
    (cmd: string, val?: string) => {
      docRef.current?.focus();
      try {
        document.execCommand(cmd, false, val);
      } catch {}
      notifyChange();
    },
    [notifyChange],
  );

  const formatBlock = useCallback(
    (tag: string) => {
      docRef.current?.focus();
      try {
        document.execCommand("formatBlock", false, tag);
      } catch {}
      notifyChange();
    },
    [notifyChange],
  );

  const insertHTML = useCallback(
    (html: string) => {
      docRef.current?.focus();
      try {
        document.execCommand("insertHTML", false, html);
      } catch {}
      setTimeout(() => {
        if (docRef.current) hydrateBody(docRef.current);
      }, 30);
      notifyChange();
    },
    [notifyChange],
  );

  const insertCallout = (kind: CalloutKind) => {
    const m = CALLOUT_META[kind];
    insertHTML(
      `<div class="callout ${m.cls}" data-callout-type="${kind}"><div class="ico">${m.ico}</div><div class="body"><p><strong>${m.label}</strong></p><p>여기에 내용을 입력하세요.</p></div></div><p></p>`,
    );
    setCalloutOpen(false);
  };

  const insertTable = (rows: number, cols: number) => {
    const headCells = Array.from(
      { length: cols },
      (_, i) => `<th>제목 ${i + 1}</th>`,
    ).join("");
    const bodyRows = Array.from(
      { length: rows },
      () =>
        `<tr>${Array.from({ length: cols }, () => "<td>내용</td>").join("")}</tr>`,
    ).join("");
    insertHTML(
      `<table><thead><tr>${headCells}</tr></thead><tbody>${bodyRows}</tbody></table><p></p>`,
    );
    setTableOpen(false);
  };

  const insertImage = () => {
    insertHTML(
      `<div class="img-block" contenteditable="false"><div class="img-frame">이미지를 여기에 놓으세요</div><div class="caption" contenteditable="true">캡션을 입력하세요</div></div><p></p>`,
    );
  };

  const insertChecklist = () => {
    insertHTML(
      `<ul class="checklist"><li><input type="checkbox"/>할 일 1</li><li><input type="checkbox"/>할 일 2</li><li><input type="checkbox"/>할 일 3</li></ul><p></p>`,
    );
  };

  const insertCode = () => {
    insertHTML(
      `<pre><code>// 여기에 코드를 입력하세요\nconsole.log("Hello");</code></pre><p></p>`,
    );
  };

  const insertDivider = () => insertHTML(`<hr/><p></p>`);

  const insertLink = () => {
    const url = window.prompt("URL", "https://");
    if (url) exec("createLink", url);
  };

  const insertScriptCard = () => {
    insertHTML(
      `<div class="script-card" contenteditable="false" data-template="{고객명}님, 안녕하십니까. 무엇을 도와드릴까요?"><div class="sc-hd"><span class="lbl">SCRIPT</span><span contenteditable="true">스크립트 제목</span><span class="spacer"></span><button class="copy-btn" data-action="copy">📋 복사</button></div><div class="sc-body"><span class="var-slot" data-var="고객명">{고객명}</span>님, 안녕하십니까. 무엇을 도와드릴까요?</div><div class="sc-vars"><span class="vk">고객명 <input type="text" data-var-input="고객명" placeholder="홍길동"/></span></div></div><p></p>`,
    );
  };

  const insertDecisionTree = () => {
    const tree = JSON.stringify({
      q: "질문 내용",
      y: { r: "예일 때 답변", good: true },
      n: { r: "아니오일 때 답변", good: false },
    });
    insertHTML(
      `<div class="decision-tree" contenteditable="false" data-tree='${tree}'><div class="dt-hd">인터랙티브 가이드</div><div class="dt-question">질문 내용</div><div class="dt-choices"><button class="dt-choice" data-choice="y">✓ 예</button><button class="dt-choice" data-choice="n">✗ 아니오</button></div><div class="dt-path"></div></div><p></p>`,
    );
  };

  const insertEmbed = () => {
    const list = EMBED_KEYS.join("\n");
    const key = window.prompt(
      `임베드 키를 선택하세요:\n${list}`,
      EMBED_KEYS[0],
    );
    if (!key) return;
    insertHTML(
      `<div class="embed" contenteditable="false" data-embed="${key}"></div><p></p>`,
    );
  };

  // ── Find / replace ──────────────────────────────────────────────
  useEffect(() => {
    if (!docRef.current) return;
    // Strip existing marks
    docRef.current.querySelectorAll("mark.search-hit").forEach((m) => {
      const txt = document.createTextNode(m.textContent ?? "");
      m.replaceWith(txt);
    });
    docRef.current.normalize();
    if (!findQ.trim()) {
      setHits(0);
      setHitIdx(0);
      return;
    }

    const walker = document.createTreeWalker(
      docRef.current,
      NodeFilter.SHOW_TEXT,
    );
    const nodes: Node[] = [];
    let n: Node | null;
    while ((n = walker.nextNode())) nodes.push(n);
    const q = findQ.toLowerCase();
    let count = 0;
    nodes.forEach((node) => {
      const txt = node.textContent ?? "";
      if (!txt.toLowerCase().includes(q)) return;
      const frag = document.createDocumentFragment();
      let i = 0;
      const lower = txt.toLowerCase();
      while (i < txt.length) {
        const found = lower.indexOf(q, i);
        if (found === -1) {
          frag.appendChild(document.createTextNode(txt.slice(i)));
          break;
        }
        if (found > i)
          frag.appendChild(document.createTextNode(txt.slice(i, found)));
        const mark = document.createElement("mark");
        mark.className = "search-hit";
        mark.textContent = txt.slice(found, found + q.length);
        frag.appendChild(mark);
        count++;
        i = found + q.length;
      }
      (node as ChildNode).replaceWith(frag);
    });
    const all = docRef.current.querySelectorAll("mark.search-hit");
    if (all[0]) all[0].classList.add("current");
    setHits(count);
    setHitIdx(count > 0 ? 1 : 0);
  }, [findQ]);

  useEffect(() => {
    if (!docRef.current) return;
    const all = docRef.current.querySelectorAll("mark.search-hit");
    all.forEach((m, i) => m.classList.toggle("current", i + 1 === hitIdx));
    if (all[hitIdx - 1]) {
      (all[hitIdx - 1] as HTMLElement).scrollIntoView({ block: "center" });
    }
  }, [hitIdx]);

  const next = () => setHitIdx((i) => (hits ? (i % hits) + 1 : 0));
  const prev = () => setHitIdx((i) => (hits ? ((i - 2 + hits) % hits) + 1 : 0));

  const doReplaceAll = () => {
    if (!findQ || !docRef.current) return;
    docRef.current
      .querySelectorAll("mark.search-hit")
      .forEach((m) =>
        m.replaceWith(document.createTextNode(m.textContent ?? "")),
      );
    docRef.current.normalize();
    const walker = document.createTreeWalker(
      docRef.current,
      NodeFilter.SHOW_TEXT,
    );
    const nodes: Text[] = [];
    let n: Node | null;
    while ((n = walker.nextNode())) nodes.push(n as Text);
    const re = new RegExp(
      findQ.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "gi",
    );
    nodes.forEach((node) => {
      if (re.test(node.textContent ?? "")) {
        node.textContent = (node.textContent ?? "").replace(re, replaceQ);
      }
    });
    setFindQ("");
    setReplaceQ("");
    notifyChange();
  };

  // ── Mention selection ───────────────────────────────────────────
  const filteredMembers = mention
    ? members.filter((m) =>
        m.name.toLowerCase().includes(mention.query.toLowerCase()),
      ).slice(0, 6)
    : [];

  const selectMention = (m: TeamMember) => {
    const st = mentionRef.current;
    if (!st || !docRef.current) return;
    const range = document.createRange();
    range.setStart(st.anchorNode, st.startOffset);
    range.setEnd(st.anchorNode, st.endOffset);
    range.deleteContents();
    const span = document.createElement("span");
    span.className = "mention";
    span.setAttribute("data-id", m.id);
    span.textContent = m.name;
    range.insertNode(span);
    // Caret after the chip
    range.setStartAfter(span);
    range.collapse(true);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    // Insert a trailing space
    document.execCommand("insertText", false, " ");
    setMention(null);
    notifyChange();
  };

  const onDocKeyDown = (e: React.KeyboardEvent) => {
    const st = mentionRef.current;
    if (!st) return;
    // We need to compute the live filtered list size to clamp idx
    const list = members.filter((m) =>
      m.name.toLowerCase().includes(st.query.toLowerCase()),
    ).slice(0, 6);
    if (!list.length && e.key !== "Escape") return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setMention((prev) =>
        prev
          ? { ...prev, activeIdx: (prev.activeIdx + 1) % list.length }
          : prev,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setMention((prev) =>
        prev
          ? {
              ...prev,
              activeIdx: (prev.activeIdx - 1 + list.length) % list.length,
            }
          : prev,
      );
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      const target = list[st.activeIdx] ?? list[0];
      if (target) selectMention(target);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setMention(null);
    }
  };

  // ── Image drag-drop into .img-block ─────────────────────────────
  const onDragOverDoc = (e: React.DragEvent) => {
    const target = (e.target as HTMLElement).closest(".img-block");
    if (target) {
      e.preventDefault();
      target.classList.add("dropping");
    }
  };
  const onDragLeaveDoc = (e: React.DragEvent) => {
    const target = (e.target as HTMLElement).closest(".img-block");
    if (target) target.classList.remove("dropping");
  };
  const onDropDoc = (e: React.DragEvent) => {
    const target = (e.target as HTMLElement).closest(".img-block");
    if (!target) return;
    e.preventDefault();
    target.classList.remove("dropping");
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith("image/")) return;

    const frame = target.querySelector(".img-frame") as HTMLElement | null;
    if (!frame) return;

    // Show a blob preview immediately so the user sees feedback while the
    // upload runs. We intentionally do NOT notifyChange here — saving the
    // blob URL to the DB would persist a broken reference if the upload
    // failed or if the user navigated away mid-upload. We only save once
    // the permanent URL is in place.
    const previewUrl = URL.createObjectURL(file);
    const imgStyle =
      "max-width:100%;max-height:280px;object-fit:contain;border-radius:8px";
    frame.style.background = "";
    frame.innerHTML = `<img src="${previewUrl}" data-uploading="1" style="${imgStyle};opacity:0.7"/>`;

    void (async () => {
      try {
        // 1) Signed upload URL (gates role/size/mime).
        const grant = await createUploadSignedUrlAction({
          kind: "editor-image",
          documentId: activeId,
          fileSize: file.size,
          mimeType: file.type || "application/octet-stream",
        });
        // 2) Browser uploads direct to Supabase Storage — no Vercel hop.
        const supabase = createBrowserSupabase();
        const { error: upErr } = await supabase.storage
          .from(grant.bucket)
          .uploadToSignedUrl(grant.path, grant.token, file);
        if (upErr) throw upErr;
        // 3) Resolve the served URL we should put in the document HTML.
        const { url } = await finalizeEditorImageAction({
          storagePath: grant.path,
        });
        const img = frame.querySelector(
          'img[data-uploading="1"]',
        ) as HTMLImageElement | null;
        if (img) {
          img.src = url;
          img.removeAttribute("data-uploading");
          img.style.opacity = "";
        }
        URL.revokeObjectURL(previewUrl);
        notifyChange();
      } catch (err) {
        console.error("editor image upload failed", err);
        toast.error(toastErrorMessage(err, "이미지 업로드에 실패했습니다."));
        // Roll back to the empty drop zone so the user can retry. Removing
        // just the <img> keeps the surrounding .img-block + caption intact.
        URL.revokeObjectURL(previewUrl);
        frame.innerHTML = "이미지를 여기에 놓으세요";
        notifyChange();
      }
    })();
  };

  // ── Checkbox click toggling (live in doc) ───────────────────────
  useEffect(() => {
    if (!docRef.current) return;
    const handler = (e: Event) => {
      const t = e.target as HTMLInputElement;
      if (t.matches && t.matches('input[type="checkbox"]')) {
        const li = t.closest("li");
        if (li) li.classList.toggle("done", t.checked);
      }
    };
    const node = docRef.current;
    node.addEventListener("click", handler);
    return () => node.removeEventListener("click", handler);
  }, []);

  // ── Copy tracking ──────────────────────────────────────────────
  // Bump page_stats.copies when the user copies *something* from this doc
  // body. Throttled per-document to avoid linear inflation when a user
  // copies many fragments. Empty selections (Ctrl+C on nothing) skipped.
  useEffect(() => {
    if (!docRef.current) return;
    const node = docRef.current;
    const onCopy = () => {
      const sel = window.getSelection?.();
      if (!sel || sel.isCollapsed) return;
      const now = Date.now();
      const last = lastCopiedAt.get(activeId) ?? 0;
      if (now - last < COPY_THROTTLE_MS) return;
      lastCopiedAt.set(activeId, now);
      void recordPageStatAction(activeId, "copy");
    };
    node.addEventListener("copy", onCopy);
    return () => node.removeEventListener("copy", onCopy);
  }, [activeId]);

  // ── Render ──────────────────────────────────────────────────────
  return (
    <>
      {editable && (
        <div className="toolbar" onMouseDown={(e) => e.preventDefault()}>
          <div className="grp">
            <Btn title="실행 취소 (⌘Z)" onClick={() => exec("undo")}>
              <Ic.undo />
            </Btn>
            <Btn title="다시 실행 (⌘⇧Z)" onClick={() => exec("redo")}>
              <Ic.redo />
            </Btn>
          </div>

          <div className="grp">
            <select
              className="tb-sel"
              defaultValue="p"
              onChange={(e) => formatBlock(e.target.value)}
            >
              <option value="p">본문</option>
              <option value="h1">제목 1</option>
              <option value="h2">제목 2</option>
              <option value="h3">제목 3</option>
            </select>
          </div>

          <div className="grp">
            <Btn active={activeFormats.bold} title="굵게" onClick={() => exec("bold")}>
              <Ic.bold />
            </Btn>
            <Btn active={activeFormats.italic} title="기울임" onClick={() => exec("italic")}>
              <Ic.italic />
            </Btn>
            <Btn active={activeFormats.underline} title="밑줄" onClick={() => exec("underline")}>
              <Ic.underline />
            </Btn>
            <Btn active={activeFormats.strikeThrough} title="취소선" onClick={() => exec("strikeThrough")}>
              <Ic.strike />
            </Btn>
          </div>

          <div className="grp" style={{ position: "relative" }}>
            <button
              type="button"
              className="tb"
              title="글자색"
              onClick={() =>
                setColorOpen(colorOpen === "fg" ? null : "fg")
              }
              style={{ position: "relative" }}
            >
              <span style={{ fontWeight: 700, fontSize: 12 }}>A</span>
              <span
                style={{
                  position: "absolute",
                  bottom: 4,
                  left: 6,
                  right: 6,
                  height: 3,
                  background: "var(--accent)",
                  borderRadius: 1,
                }}
              />
            </button>
            <button
              type="button"
              className="tb"
              title="형광펜"
              onClick={() =>
                setColorOpen(colorOpen === "bg" ? null : "bg")
              }
            >
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 12,
                  background: "#fff7a8",
                  padding: "0 3px",
                  borderRadius: 2,
                  color: "#5a4a00",
                }}
              >
                A
              </span>
            </button>
            {colorOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  marginTop: 4,
                  background: "var(--panel)",
                  border: "1px solid var(--line)",
                  borderRadius: 8,
                  padding: 8,
                  zIndex: 50,
                  boxShadow: "var(--shadow-md)",
                  display: "grid",
                  gridTemplateColumns: "repeat(6, 20px)",
                  gap: 4,
                }}
              >
                {(colorOpen === "fg" ? TEXT_COLORS : HIGHLIGHT_COLORS).map(
                  (c) => (
                    <button
                      key={c}
                      type="button"
                      className="sw"
                      style={{
                        background: c,
                        width: 20,
                        height: 20,
                        border: "1px solid rgba(0,0,0,0.08)",
                        borderRadius: 3,
                        cursor: "pointer",
                      }}
                      onClick={() => {
                        exec(
                          colorOpen === "fg" ? "foreColor" : "hiliteColor",
                          c,
                        );
                        setColorOpen(null);
                      }}
                    />
                  ),
                )}
              </div>
            )}
          </div>

          <div className="grp">
            <Btn
              active={activeFormats.insertUnorderedList}
              title="글머리 목록"
              onClick={() => exec("insertUnorderedList")}
            >
              <Ic.bullet />
            </Btn>
            <Btn
              active={activeFormats.insertOrderedList}
              title="번호 목록"
              onClick={() => exec("insertOrderedList")}
            >
              <Ic.ordered />
            </Btn>
            <Btn title="체크리스트" onClick={insertChecklist}>
              <Ic.checklist />
            </Btn>
          </div>

          <div className="grp">
            <Btn
              active={activeFormats.justifyLeft}
              title="왼쪽 정렬"
              onClick={() => exec("justifyLeft")}
            >
              <Ic.align_left />
            </Btn>
            <Btn
              active={activeFormats.justifyCenter}
              title="가운데 정렬"
              onClick={() => exec("justifyCenter")}
            >
              <Ic.align_center />
            </Btn>
            <Btn
              active={activeFormats.justifyRight}
              title="오른쪽 정렬"
              onClick={() => exec("justifyRight")}
            >
              <Ic.align_right />
            </Btn>
          </div>

          <div className="grp">
            <Btn wide title="표 삽입" onClick={() => setTableOpen(true)}>
              <Ic.table /> 표
            </Btn>
            <Btn wide title="이미지" onClick={insertImage}>
              <Ic.image /> 이미지
            </Btn>
            <div style={{ position: "relative", display: "inline-flex" }}>
              <Btn
                wide
                title="콜아웃"
                active={calloutOpen}
                onClick={() => setCalloutOpen((v) => !v)}
              >
                <Ic.callout /> 콜아웃 ▾
              </Btn>
              {calloutOpen && (
                <>
                  <button
                    type="button"
                    style={{
                      position: "fixed",
                      inset: 0,
                      zIndex: 49,
                      background: "transparent",
                      border: 0,
                      cursor: "default",
                    }}
                    onClick={() => setCalloutOpen(false)}
                    aria-label="close"
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      marginTop: 4,
                      background: "var(--panel)",
                      border: "1px solid var(--line)",
                      borderRadius: 8,
                      padding: 4,
                      zIndex: 50,
                      boxShadow: "var(--shadow-md)",
                      minWidth: 150,
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    {(Object.keys(CALLOUT_META) as CalloutKind[]).map((k) => {
                      const m = CALLOUT_META[k];
                      return (
                        <button
                          key={k}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            insertCallout(k);
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "6px 10px",
                            border: 0,
                            background: "transparent",
                            fontSize: 12.5,
                            color: "var(--ink)",
                            cursor: "pointer",
                            textAlign: "left",
                            borderRadius: 4,
                          }}
                        >
                          <span
                            className={`callout ${m.cls}`}
                            style={{
                              padding: "0 6px",
                              margin: 0,
                              border: 0,
                              borderLeft: "3px solid currentColor",
                              borderRadius: 3,
                              minWidth: 18,
                              fontSize: 12,
                              lineHeight: "16px",
                            }}
                          >
                            {m.ico}
                          </span>
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
            <Btn wide title="코드" onClick={insertCode}>
              <Ic.code /> 코드
            </Btn>
            <Btn wide title="응대 스크립트" onClick={insertScriptCard}>
              📋 스크립트
            </Btn>
            <Btn wide title="결정 트리" onClick={insertDecisionTree}>
              🌿 분기
            </Btn>
            <Btn wide title="외부 임베드" onClick={insertEmbed}>
              🔗 임베드
            </Btn>
            <Btn title="구분선" onClick={insertDivider}>
              <Ic.divider />
            </Btn>
            <Btn title="링크" onClick={insertLink}>
              <Ic.link />
            </Btn>
          </div>

          <div style={{ flex: 1 }} />

          <div className="grp" style={{ borderRight: 0 }}>
            <Btn title="찾기/바꾸기" onClick={() => setFindOpen((v) => !v)}>
              <Ic.search />
            </Btn>
            <Btn title="PDF로 내보내기" onClick={() => window.print()}>
              <Ic.download />
            </Btn>
            <Btn title="인쇄" onClick={() => window.print()}>
              <Ic.print />
            </Btn>
          </div>
        </div>
      )}

      <div
        className="doc-body"
        onDragOver={onDragOverDoc}
        onDragLeave={onDragLeaveDoc}
        onDrop={onDropDoc}
      >
        {findOpen && (
          <div className="find-bar">
            <input
              data-fb="q"
              placeholder="문서에서 찾기"
              value={findQ}
              onChange={(e) => setFindQ(e.target.value)}
            />
            <div className="fb-actions">
              <span className="count">{hits ? `${hitIdx}/${hits}` : "0"}</span>
              <button onClick={prev} title="이전">
                <Ic.chev_up />
              </button>
              <button onClick={next} title="다음">
                <Ic.chev_down />
              </button>
              <button onClick={() => setFindOpen(false)} title="닫기">
                <Ic.close />
              </button>
            </div>
            <input
              placeholder="바꾸기"
              value={replaceQ}
              onChange={(e) => setReplaceQ(e.target.value)}
            />
            <button
              onClick={doReplaceAll}
              style={{
                width: "auto",
                padding: "0 10px",
                fontSize: 11.5,
                fontWeight: 500,
                background: "var(--accent)",
                color: "white",
                borderRadius: 4,
              }}
            >
              전체 바꾸기
            </button>
          </div>
        )}

        <div
          ref={docRef}
          className="doc"
          contentEditable={editable}
          suppressContentEditableWarning
          onInput={notifyChange}
          onKeyDown={onDocKeyDown}
          spellCheck={false}
        />
        {editable && <TableEditorOverlay docRef={docRef} />}
        {bottomSlot}
      </div>

      {tableOpen && (
        <TableInsertModal
          onInsert={(rows, cols) => insertTable(rows, cols)}
          onClose={() => setTableOpen(false)}
        />
      )}

      {mention && filteredMembers.length > 0 && (
        <div
          className="mention-pop"
          style={{ left: mention.x, top: mention.y, position: "fixed" }}
          onMouseDown={(e) => e.preventDefault()}
        >
          {filteredMembers.map((m, i) => (
            <button
              key={m.id}
              type="button"
              className={`mn${i === mention.activeIdx ? " on" : ""}`}
              onClick={() => selectMention(m)}
              style={{
                border: 0,
                width: "100%",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <span className="av" style={{ background: m.color }}>
                {m.initials}
              </span>
              <span>{m.name}</span>
              <span className="rl">{m.role}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

// ─── Reusable toolbar button ─────────────────────────────────────────
function Btn({
  children,
  active,
  onClick,
  title,
  disabled,
  wide,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  title?: string;
  disabled?: boolean;
  wide?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`tb${wide ? " wide" : ""}${active ? " on" : ""}`}
    >
      {children}
    </button>
  );
}

// ─── Table insert modal (per screenshot — row/col input) ─────────────
function TableInsertModal({
  onInsert,
  onClose,
}: {
  onInsert: (rows: number, cols: number) => void;
  onClose: () => void;
}) {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);

  return (
    <>
      <button
        type="button"
        aria-label="close"
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(20,15,5,.32)",
          backdropFilter: "blur(4px)",
          zIndex: 1000,
          border: 0,
          cursor: "default",
        }}
      />
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 1001,
          width: 360,
          background: "var(--panel)",
          border: "1px solid var(--line)",
          borderRadius: 12,
          boxShadow: "var(--shadow-md)",
          padding: 18,
        }}
      >
        <h3
          style={{
            margin: "0 0 4px",
            fontSize: 15,
            fontWeight: 600,
            color: "var(--ink)",
            letterSpacing: "-0.01em",
          }}
        >
          표 삽입
        </h3>
        <p
          style={{
            margin: "0 0 16px",
            fontSize: 12,
            color: "var(--ink-3)",
          }}
        >
          행과 열 수를 선택하세요. 머리글은 자동 추가됩니다.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <Counter
            label="행 (1~12)"
            value={rows}
            min={1}
            max={12}
            onChange={setRows}
          />
          <Counter
            label="열 (1~8)"
            value={cols}
            min={1}
            max={8}
            onChange={setCols}
          />
        </div>

        <div
          style={{
            background: "var(--bg-2)",
            border: "1px solid var(--line)",
            borderRadius: 8,
            padding: 10,
            marginBottom: 16,
            overflow: "auto",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {Array.from({ length: cols }).map((_, i) => (
                  <th
                    key={i}
                    style={{
                      padding: "4px 6px",
                      border: "1px solid var(--line)",
                      background: "var(--panel)",
                      fontSize: 10.5,
                      color: "var(--ink-2)",
                    }}
                  >
                    제목 {i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: Math.min(rows, 4) }).map((_, ri) => (
                <tr key={ri}>
                  {Array.from({ length: cols }).map((_, ci) => (
                    <td
                      key={ci}
                      style={{
                        padding: "4px 6px",
                        border: "1px solid var(--line)",
                        fontSize: 10.5,
                        color: "var(--ink-3)",
                        background:
                          ri % 2 === 1 ? "var(--bg-2)" : "var(--panel)",
                      }}
                    >
                      내용
                    </td>
                  ))}
                </tr>
              ))}
              {rows > 4 && (
                <tr>
                  <td
                    colSpan={cols}
                    style={{
                      padding: 6,
                      fontSize: 10,
                      color: "var(--ink-4)",
                      textAlign: "center",
                      fontStyle: "italic",
                      border: "1px solid var(--line)",
                    }}
                  >
                    ... + {rows - 4} 행
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              border: "1px solid var(--line)",
              background: "var(--panel)",
              color: "var(--ink-2)",
              fontSize: 12.5,
              cursor: "pointer",
            }}
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => onInsert(rows, cols)}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              border: 0,
              background: "var(--accent)",
              color: "white",
              fontSize: 12.5,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            삽입
          </button>
        </div>
      </div>
    </>
  );
}

function Counter({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--ink-3)",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 0,
          border: "1px solid var(--line)",
          borderRadius: 6,
          background: "var(--bg-2)",
        }}
      >
        <button
          type="button"
          onClick={() => onChange(clamp(value - 1))}
          style={{
            width: 30,
            height: 32,
            border: 0,
            background: "transparent",
            cursor: "pointer",
            color: "var(--ink-2)",
            fontSize: 16,
          }}
        >
          −
        </button>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(clamp(Number(e.target.value) || min))}
          style={{
            flex: 1,
            border: 0,
            background: "transparent",
            textAlign: "center",
            fontSize: 14,
            fontWeight: 600,
            fontFamily: "var(--font-en)",
            color: "var(--ink)",
            outline: "none",
            MozAppearance: "textfield",
          }}
        />
        <button
          type="button"
          onClick={() => onChange(clamp(value + 1))}
          style={{
            width: 30,
            height: 32,
            border: 0,
            background: "transparent",
            cursor: "pointer",
            color: "var(--ink-2)",
            fontSize: 16,
          }}
        >
          +
        </button>
      </div>
    </div>
  );
}
