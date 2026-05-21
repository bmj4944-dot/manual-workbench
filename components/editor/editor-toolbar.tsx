"use client";

import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  CheckSquare,
  Code,
  Download,
  GitBranch,
  Highlighter,
  Image as ImageIcon,
  Info,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  Palette,
  Plug,
  Printer,
  Redo2,
  Search,
  Strikethrough,
  Table as TableIcon,
  Underline as UnderlineIcon,
  Undo2,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TEXT_COLORS = [
  { name: "기본", value: "inherit" },
  { name: "회색", value: "oklch(0.510 0.010 80)" },
  { name: "빨강", value: "oklch(0.55 0.18 28)" },
  { name: "주황", value: "oklch(0.62 0.16 55)" },
  { name: "파랑", value: "oklch(0.50 0.13 240)" },
  { name: "녹색", value: "oklch(0.55 0.13 145)" },
  { name: "보라", value: "oklch(0.50 0.15 290)" },
];

const HIGHLIGHTS = [
  { name: "없음", value: "" },
  { name: "노랑", value: "oklch(0.94 0.13 95 / 0.55)" },
  { name: "초록", value: "oklch(0.92 0.10 145 / 0.55)" },
  { name: "파랑", value: "oklch(0.92 0.08 240 / 0.55)" },
  { name: "분홍", value: "oklch(0.92 0.09 12 / 0.55)" },
  { name: "주황", value: "oklch(0.94 0.13 75 / 0.55)" },
];

const CALLOUT_TEMPLATES = {
  info: `<div class="callout info"><div class="ico">i</div><div class="body"><p>핵심 원칙</p><p>설명을 여기에 작성합니다.</p></div></div><p></p>`,
  warn: `<div class="callout warn"><div class="ico">!</div><div class="body"><p>주의</p><p>주의사항을 여기에 작성합니다.</p></div></div><p></p>`,
  tip: `<div class="callout tip"><div class="ico">✓</div><div class="body"><p>팁</p><p>도움이 되는 팁을 여기에 작성합니다.</p></div></div><p></p>`,
};

const SCRIPT_CARD_TEMPLATE = `<div class="script-card" contenteditable="false" data-template="{고객명}님, 안녕하십니까. 무엇을 도와드릴까요?"><div class="sc-hd"><span class="lbl">SCRIPT</span><span contenteditable="true">스크립트 제목</span><span class="spacer"></span><button class="copy-btn" data-action="copy">📋 복사</button></div><div class="sc-body"><span class="var-slot" data-var="고객명">{고객명}</span>님, 안녕하십니까. 무엇을 도와드릴까요?</div><div class="sc-vars"><span class="vk">고객명 <input type="text" data-var-input="고객명" placeholder="홍길동"/></span></div></div><p></p>`;

const DECISION_TREE_TEMPLATE = `<div class="decision-tree" contenteditable="false" data-tree='${JSON.stringify(
  {
    q: "고객이 변심에 의한 환불을 요청합니까?",
    y: {
      q: "구매한 지 7일 이내입니까?",
      y: { r: "전액 환불 가능", good: true },
      n: { r: "단순 변심은 환불 불가", good: false },
    },
    n: { r: "사유별 검토 필요", good: false },
  },
)}'><div class="dt-hd">🌿 인터랙티브 가이드</div><div class="dt-question">질문 내용</div><div class="dt-choices"><button class="dt-choice" data-choice="y">✓ 예</button><button class="dt-choice" data-choice="n">✗ 아니오</button></div><div class="dt-path"></div></div><p></p>`;

const EMBED_TEMPLATE = `<div class="embed" data-embed="ticket-CRM-3201" contenteditable="false"></div><p></p>`;

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

  const insertRaw = (html: string) =>
    editor.chain().focus().insertContent(html).run();

  return (
    <div className="toolbar">
      <div className="grp">
        <Btn onClick={() => editor.chain().focus().undo().run()} title="실행 취소 (⌘Z)" disabled={!editor.can().undo()}>
          <Undo2 size={13} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().redo().run()} title="다시 실행 (⌘⇧Z)" disabled={!editor.can().redo()}>
          <Redo2 size={13} />
        </Btn>
      </div>

      <div className="grp">
        <select
          className="tb-sel"
          value={currentHeading}
          onChange={(e) => setHeading(Number(e.target.value) as 0 | 1 | 2 | 3 | 4)}
        >
          <option value={0}>본문</option>
          <option value={1}>제목 1</option>
          <option value={2}>제목 2</option>
          <option value={3}>제목 3</option>
          <option value={4}>제목 4</option>
        </select>
      </div>

      <div className="grp">
        <Btn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="굵게 (⌘B)">
          <Bold size={13} />
        </Btn>
        <Btn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="기울임 (⌘I)">
          <Italic size={13} />
        </Btn>
        <Btn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="밑줄 (⌘U)">
          <UnderlineIcon size={13} />
        </Btn>
        <Btn active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} title="취소선">
          <Strikethrough size={13} />
        </Btn>
        <ColorPopover
          icon={<Palette size={13} />}
          title="글자색"
          items={TEXT_COLORS}
          onPick={(c) => {
            if (c === "inherit") editor.chain().focus().unsetColor().run();
            else editor.chain().focus().setColor(c).run();
          }}
        />
        <ColorPopover
          icon={<Highlighter size={13} />}
          title="형광펜"
          items={HIGHLIGHTS}
          onPick={(c) => {
            if (!c) editor.chain().focus().unsetHighlight().run();
            else editor.chain().focus().toggleHighlight({ color: c }).run();
          }}
        />
      </div>

      <div className="grp">
        <Btn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="글머리 목록">
          <List size={13} />
        </Btn>
        <Btn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="번호 목록">
          <ListOrdered size={13} />
        </Btn>
        <Btn active={editor.isActive("taskList")} onClick={() => editor.chain().focus().toggleTaskList().run()} title="체크리스트">
          <CheckSquare size={13} />
        </Btn>
      </div>

      <div className="grp">
        <Btn active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()} title="왼쪽">
          <AlignLeft size={13} />
        </Btn>
        <Btn active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} title="가운데">
          <AlignCenter size={13} />
        </Btn>
        <Btn active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()} title="오른쪽">
          <AlignRight size={13} />
        </Btn>
      </div>

      <div className="grp">
        <Btn
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          title="표 삽입"
          wide
        >
          <TableIcon size={12} /> 표
        </Btn>
        <Btn
          onClick={() => {
            const url = window.prompt("이미지 URL을 입력하세요", "https://");
            if (url) editor.chain().focus().setImage({ src: url }).run();
          }}
          title="이미지"
          wide
        >
          <ImageIcon size={12} /> 이미지
        </Btn>
        <CalloutPicker onPick={(kind) => insertRaw(CALLOUT_TEMPLATES[kind])} />
        <Btn onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="코드 블록" wide>
          <Code size={12} /> 코드
        </Btn>
        <Btn onClick={() => insertRaw(SCRIPT_CARD_TEMPLATE)} title="응대 스크립트 카드" wide>
          <Wand2 size={12} /> 스크립트
        </Btn>
        <Btn onClick={() => insertRaw(DECISION_TREE_TEMPLATE)} title="결정 트리" wide>
          <GitBranch size={12} /> 분기
        </Btn>
        <Btn onClick={() => insertRaw(EMBED_TEMPLATE)} title="외부 시스템 임베드" wide>
          <Plug size={12} /> 임베드
        </Btn>
        <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="구분선">
          <Minus size={13} />
        </Btn>
        <Btn
          onClick={() => {
            const url = window.prompt("URL을 입력하세요", "https://");
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }}
          title="링크"
        >
          <LinkIcon size={13} />
        </Btn>
      </div>

      {editor.isActive("table") && (
        <div className="grp">
          <TableActions editor={editor} />
        </div>
      )}

      <span style={{ flex: 1 }} />

      <div className="grp">
        <Btn onClick={() => { /* find replace handled via Cmd+F in main-pane */ }} title="찾기/바꾸기">
          <Search size={13} />
        </Btn>
        <Btn onClick={() => window.print()} title="PDF로 내보내기">
          <Download size={13} />
        </Btn>
        <Btn onClick={() => window.print()} title="인쇄">
          <Printer size={13} />
        </Btn>
      </div>
    </div>
  );
}

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
      className={cn("tb", wide && "wide", active && "on")}
    >
      {children}
    </button>
  );
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
    <div style={{ position: "relative" }}>
      <Btn onClick={() => setOpen((v) => !v)} active={open} title={title}>
        {icon}
      </Btn>
      {open && (
        <>
          <button
            type="button"
            style={{ position: "fixed", inset: 0, zIndex: 10, background: "transparent", border: 0, cursor: "default" }}
            onClick={() => setOpen(false)}
            aria-label="close"
          />
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              zIndex: 20,
              marginTop: 4,
              padding: 6,
              borderRadius: 6,
              background: "var(--panel)",
              border: "1px solid var(--line)",
              boxShadow: "var(--shadow-md)",
              display: "flex",
              gap: 4,
            }}
          >
            {items.map((it) => (
              <button
                key={it.name}
                type="button"
                title={it.name}
                className="sw"
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 4,
                  border: "1px solid rgba(0,0,0,0.08)",
                  background: it.value || "transparent",
                  cursor: "pointer",
                }}
                onClick={() => {
                  onPick(it.value);
                  setOpen(false);
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CalloutPicker({
  onPick,
}: {
  onPick: (kind: "info" | "warn" | "tip") => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <Btn onClick={() => setOpen((v) => !v)} active={open} title="콜아웃" wide>
        <Info size={12} /> 콜아웃
      </Btn>
      {open && (
        <>
          <button
            type="button"
            style={{ position: "fixed", inset: 0, zIndex: 10, background: "transparent", border: 0, cursor: "default" }}
            onClick={() => setOpen(false)}
            aria-label="close"
          />
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              zIndex: 20,
              marginTop: 4,
              padding: 4,
              borderRadius: 6,
              background: "var(--panel)",
              border: "1px solid var(--line)",
              boxShadow: "var(--shadow-md)",
              display: "flex",
              flexDirection: "column",
              minWidth: 120,
            }}
          >
            {(["info", "warn", "tip"] as const).map((k) => (
              <button
                key={k}
                type="button"
                style={{
                  border: 0,
                  background: "transparent",
                  padding: "6px 10px",
                  fontSize: 12.5,
                  color: "var(--ink-2)",
                  cursor: "pointer",
                  textAlign: "left",
                  borderRadius: 4,
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onPick(k);
                  setOpen(false);
                }}
              >
                {k === "info" ? "ℹ︎ 정보" : k === "warn" ? "⚠︎ 주의" : "✓ 팁"}
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
    <>
      <Btn onClick={() => editor.chain().focus().addRowAfter().run()} title="행 추가">
        +행
      </Btn>
      <Btn onClick={() => editor.chain().focus().addColumnAfter().run()} title="열 추가">
        +열
      </Btn>
      <Btn onClick={() => editor.chain().focus().deleteRow().run()} title="행 삭제">
        −행
      </Btn>
      <Btn onClick={() => editor.chain().focus().deleteColumn().run()} title="열 삭제">
        −열
      </Btn>
      <Btn onClick={() => editor.chain().focus().deleteTable().run()} title="표 삭제">
        ×표
      </Btn>
    </>
  );
}
