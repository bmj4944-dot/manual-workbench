"use client";

import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  CheckSquare,
  Highlighter,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  Palette,
  Redo2,
  Strikethrough,
  Table as TableIcon,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TEXT_COLORS = [
  { name: "기본", value: "inherit" },
  { name: "회색", value: "oklch(0.510 0.010 80)" },
  { name: "빨강", value: "oklch(0.55 0.18 28)" },
  { name: "주황", value: "oklch(0.62 0.16 55)" },
  { name: "파랑", value: "oklch(0.50 0.13 240)" },
  { name: "녹색", value: "oklch(0.55 0.13 145)" },
];

const HIGHLIGHTS = [
  { name: "없음", value: "" },
  { name: "노랑", value: "oklch(0.94 0.13 95 / 0.55)" },
  { name: "초록", value: "oklch(0.92 0.10 145 / 0.55)" },
  { name: "파랑", value: "oklch(0.92 0.08 240 / 0.55)" },
  { name: "분홍", value: "oklch(0.92 0.09 12 / 0.55)" },
];

type Props = {
  editor: Editor | null;
};

export function EditorToolbar({ editor }: Props) {
  const [, force] = useState({});
  useEffect(() => {
    if (!editor) return;
    const rerender = () => force({});
    editor.on("selectionUpdate", rerender);
    editor.on("transaction", rerender);
    return () => {
      editor.off("selectionUpdate", rerender);
      editor.off("transaction", rerender);
    };
  }, [editor]);

  if (!editor) return null;

  const setHeading = (level: 0 | 1 | 2 | 3 | 4) => {
    if (level === 0) editor.chain().focus().setParagraph().run();
    else editor.chain().focus().toggleHeading({ level }).run();
  };
  const currentHeading: 0 | 1 | 2 | 3 | 4 =
    editor.isActive("heading", { level: 1 }) ? 1
    : editor.isActive("heading", { level: 2 }) ? 2
    : editor.isActive("heading", { level: 3 }) ? 3
    : editor.isActive("heading", { level: 4 }) ? 4
    : 0;

  return (
    <div className="sticky top-0 z-10 -mx-2 mb-4 flex flex-wrap items-center gap-1 rounded-[var(--radius)] border border-line bg-panel/95 px-2 py-1.5 shadow-sm backdrop-blur">
      <select
        value={currentHeading}
        onChange={(e) => setHeading(Number(e.target.value) as 0 | 1 | 2 | 3 | 4)}
        className="h-7 min-w-[78px] rounded-md border border-line bg-surface-2 px-1.5 text-[12.5px] text-ink-2 hover:bg-surface-3"
      >
        <option value={0}>본문</option>
        <option value={1}>제목 1</option>
        <option value={2}>제목 2</option>
        <option value={3}>제목 3</option>
        <option value={4}>제목 4</option>
      </select>
      <Sep />
      <Btn
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="굵게 (⌘B)"
      >
        <Bold size={14} />
      </Btn>
      <Btn
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="기울임 (⌘I)"
      >
        <Italic size={14} />
      </Btn>
      <Btn
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        title="밑줄 (⌘U)"
      >
        <UnderlineIcon size={14} />
      </Btn>
      <Btn
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="취소선"
      >
        <Strikethrough size={14} />
      </Btn>
      <ColorPopover
        icon={<Palette size={14} />}
        title="글자색"
        items={TEXT_COLORS}
        onPick={(c) => {
          if (c === "inherit") editor.chain().focus().unsetColor().run();
          else editor.chain().focus().setColor(c).run();
        }}
      />
      <ColorPopover
        icon={<Highlighter size={14} />}
        title="형광펜"
        items={HIGHLIGHTS}
        onPick={(c) => {
          if (!c) editor.chain().focus().unsetHighlight().run();
          else editor.chain().focus().toggleHighlight({ color: c }).run();
        }}
      />
      <Sep />
      <Btn
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="글머리 목록"
      >
        <List size={14} />
      </Btn>
      <Btn
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="번호 목록"
      >
        <ListOrdered size={14} />
      </Btn>
      <Btn
        active={editor.isActive("taskList")}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        title="체크리스트"
      >
        <CheckSquare size={14} />
      </Btn>
      <Sep />
      <Btn
        active={editor.isActive({ textAlign: "left" })}
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        title="왼쪽 정렬"
      >
        <AlignLeft size={14} />
      </Btn>
      <Btn
        active={editor.isActive({ textAlign: "center" })}
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        title="가운데 정렬"
      >
        <AlignCenter size={14} />
      </Btn>
      <Btn
        active={editor.isActive({ textAlign: "right" })}
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        title="오른쪽 정렬"
      >
        <AlignRight size={14} />
      </Btn>
      <Sep />
      <Btn
        onClick={() => {
          const url = window.prompt("URL을 입력하세요", "https://");
          if (url) editor.chain().focus().setLink({ href: url }).run();
        }}
        title="링크"
      >
        <LinkIcon size={14} />
      </Btn>
      <Btn
        onClick={() => {
          const url = window.prompt("이미지 URL을 입력하세요", "https://");
          if (url) editor.chain().focus().setImage({ src: url }).run();
        }}
        title="이미지"
      >
        <ImageIcon size={14} />
      </Btn>
      <Btn
        active={editor.isActive("table")}
        onClick={() =>
          editor
            .chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run()
        }
        title="표 삽입"
      >
        <TableIcon size={14} />
      </Btn>
      <Btn
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="구분선"
      >
        <Minus size={14} />
      </Btn>
      <Sep />
      {editor.isActive("table") && <TableActions editor={editor} />}
      <span className="flex-1" />
      <Btn
        onClick={() => editor.chain().focus().undo().run()}
        title="실행 취소 (⌘Z)"
        disabled={!editor.can().undo()}
      >
        <Undo2 size={14} />
      </Btn>
      <Btn
        onClick={() => editor.chain().focus().redo().run()}
        title="다시 실행 (⌘⇧Z)"
        disabled={!editor.can().redo()}
      >
        <Redo2 size={14} />
      </Btn>
    </div>
  );
}

function Btn({
  children,
  active,
  onClick,
  title,
  disabled,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  title?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "grid h-7 w-7 place-items-center rounded-md text-ink-2 hover:bg-surface-2 hover:text-ink",
        active && "bg-accent-soft text-accent hover:bg-accent-soft",
        disabled && "cursor-not-allowed opacity-40 hover:bg-transparent hover:text-ink-2",
      )}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <span className="mx-0.5 h-5 w-px bg-line" />;
}

function ColorPopover({
  icon,
  title,
  items,
  onPick,
}: {
  icon: React.ReactNode;
  title: string;
  items: { name: string; value: string }[];
  onPick: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Btn onClick={() => setOpen((v) => !v)} active={open} title={title}>
        {icon}
      </Btn>
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
            aria-label="close"
          />
          <div className="absolute left-0 top-9 z-20 flex flex-wrap gap-1 rounded-md border border-line bg-panel p-1.5 shadow-md">
            {items.map((it) => (
              <button
                key={it.name}
                type="button"
                onClick={() => {
                  onPick(it.value);
                  setOpen(false);
                }}
                className="grid h-7 w-7 place-items-center rounded border border-line hover:scale-105"
                title={it.name}
                style={{ background: it.value || "transparent" }}
              >
                {!it.value && <span className="text-[10px] text-ink-3">×</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function TableActions({ editor }: { editor: Editor }) {
  return (
    <div className="flex items-center gap-0.5 rounded-md bg-accent-softer px-1 py-0.5 text-[11.5px] text-accent">
      <button
        type="button"
        className="rounded px-1.5 py-0.5 hover:bg-accent-soft"
        onClick={() => editor.chain().focus().addRowAfter().run()}
        title="행 아래"
      >
        +행
      </button>
      <button
        type="button"
        className="rounded px-1.5 py-0.5 hover:bg-accent-soft"
        onClick={() => editor.chain().focus().addColumnAfter().run()}
        title="열 오른쪽"
      >
        +열
      </button>
      <button
        type="button"
        className="rounded px-1.5 py-0.5 hover:bg-accent-soft"
        onClick={() => editor.chain().focus().deleteRow().run()}
        title="행 삭제"
      >
        −행
      </button>
      <button
        type="button"
        className="rounded px-1.5 py-0.5 hover:bg-accent-soft"
        onClick={() => editor.chain().focus().deleteColumn().run()}
        title="열 삭제"
      >
        −열
      </button>
      <button
        type="button"
        className="rounded px-1.5 py-0.5 hover:bg-accent-soft"
        onClick={() => editor.chain().focus().deleteTable().run()}
        title="표 삭제"
      >
        ×표
      </button>
    </div>
  );
}
