"use client";

import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { useEffect, useMemo } from "react";
import { SearchReplace } from "./search-replace-extension";
import { createMentionExtension } from "./mention-extension";
import { useWorkbench } from "@/lib/workbench-context";

type Props = {
  content: string;
  editable?: boolean;
  onEditor?: (editor: Editor | null) => void;
  onUpdate?: (html: string) => void;
};

export function DocumentEditor({ content, editable = true, onEditor, onUpdate }: Props) {
  const { members } = useWorkbench();
  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        underline: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "doc-link", rel: "noopener noreferrer" },
      }),
      Image.configure({ inline: false, HTMLAttributes: { class: "doc-image" } }),
      Table.configure({ resizable: true, HTMLAttributes: { class: "doc-table" } }),
      TableRow,
      TableHeader,
      TableCell,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({
        placeholder: "내용을 입력하거나 / 를 눌러 블록을 추가하세요...",
      }),
      TaskList.configure({ HTMLAttributes: { class: "task-list" } }),
      TaskItem.configure({ nested: true, HTMLAttributes: { class: "task-item" } }),
      SearchReplace,
      createMentionExtension(members),
    ],
    [members],
  );

  const editor = useEditor({
    extensions,
    content,
    editable,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "doc-prose focus:outline-none min-h-[200px]",
      },
    },
    onUpdate({ editor }) {
      onUpdate?.(editor.getHTML());
    },
  });

  useEffect(() => {
    onEditor?.(editor);
    return () => onEditor?.(null);
  }, [editor, onEditor]);

  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== content) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editable, editor]);

  return <EditorContent editor={editor} />;
}
