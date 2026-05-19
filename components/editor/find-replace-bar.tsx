"use client";

import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { ChevronDown, ChevronUp, Replace, Search, X } from "lucide-react";
import { getSearchState } from "./search-replace-extension";

type Props = {
  editor: Editor | null;
  open: boolean;
  onClose: () => void;
};

export function FindReplaceBar({ editor, open, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [replaceWith, setReplaceWith] = useState("");
  const [, force] = useState({});
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editor) return;
    const rerender = () => force({});
    editor.on("transaction", rerender);
    return () => {
      editor.off("transaction", rerender);
    };
  }, [editor]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    if (!editor) return;
    if (open) {
      editor.commands.setSearchTerm(query, false);
    } else {
      editor.commands.clearSearch();
    }
  }, [query, editor, open]);

  useEffect(() => {
    if (!editor || !open) return;
    return () => {
      editor.commands.clearSearch();
    };
  }, [editor, open]);

  if (!open) return null;
  const s = getSearchState(editor);
  const total = s?.results.length ?? 0;
  const current = total === 0 ? 0 : (s?.current ?? 0) + 1;

  return (
    <div className="sticky top-[44px] z-10 mb-3 flex flex-wrap items-center gap-2 rounded-[var(--radius)] border border-line bg-panel px-3 py-2 shadow-sm">
      <Search size={14} className="text-ink-3" />
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="찾을 내용"
        className="w-44 rounded-md border border-line bg-surface-2 px-2 py-1 text-[12.5px] text-ink outline-none focus:border-accent"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            editor?.commands[e.shiftKey ? "prevMatch" : "nextMatch"]();
          } else if (e.key === "Escape") {
            e.preventDefault();
            onClose();
          }
        }}
      />
      <span className="font-mono text-[11.5px] text-ink-3">
        {current} / {total}
      </span>
      <button
        type="button"
        className="grid h-7 w-7 place-items-center rounded-md border border-line text-ink-2 hover:bg-surface-2"
        onClick={() => editor?.commands.prevMatch()}
        title="이전"
      >
        <ChevronUp size={14} />
      </button>
      <button
        type="button"
        className="grid h-7 w-7 place-items-center rounded-md border border-line text-ink-2 hover:bg-surface-2"
        onClick={() => editor?.commands.nextMatch()}
        title="다음"
      >
        <ChevronDown size={14} />
      </button>
      <span className="mx-1 h-5 w-px bg-line" />
      <input
        value={replaceWith}
        onChange={(e) => setReplaceWith(e.target.value)}
        placeholder="바꿀 내용"
        className="w-44 rounded-md border border-line bg-surface-2 px-2 py-1 text-[12.5px] text-ink outline-none focus:border-accent"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            editor?.commands.replaceCurrent(replaceWith);
          }
        }}
      />
      <button
        type="button"
        className="rounded-md border border-line bg-surface-2 px-2 py-1 text-[12px] text-ink-2 hover:bg-surface-3"
        onClick={() => editor?.commands.replaceCurrent(replaceWith)}
      >
        바꾸기
      </button>
      <button
        type="button"
        className="flex items-center gap-1 rounded-md border border-line bg-surface-2 px-2 py-1 text-[12px] text-ink-2 hover:bg-surface-3"
        onClick={() => editor?.commands.replaceAllMatches(replaceWith)}
      >
        <Replace size={12} /> 모두
      </button>
      <span className="flex-1" />
      <button
        type="button"
        className="grid h-7 w-7 place-items-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink"
        onClick={onClose}
        title="닫기 (Esc)"
      >
        <X size={14} />
      </button>
    </div>
  );
}
