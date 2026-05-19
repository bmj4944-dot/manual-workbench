"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { MessageCircle, Star } from "lucide-react";
import { useWorkbench, findNode } from "@/lib/workbench-context";
import { SAMPLE_CONTENT, defaultBody } from "@/lib/sample-data";
import { DocumentEditor } from "@/components/editor/document-editor";
import { EditorToolbar } from "@/components/editor/editor-toolbar";
import { FindReplaceBar } from "@/components/editor/find-replace-bar";
import { WorkflowStrip } from "./workflow-strip";
import { MustReadBar } from "./must-read-bar";
import { PdfViewer } from "@/components/pdf/pdf-viewer";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const STATUS_PILL: Record<string, { bg: string; fg: string; ko: string; en: string }> = {
  draft: { bg: "bg-[oklch(0.92_0.01_80)]", fg: "text-[oklch(0.45_0.01_80)]", ko: "초안", en: "Draft" },
  review: { bg: "bg-[oklch(0.94_0.05_80)]", fg: "text-[oklch(0.45_0.14_65)]", ko: "검토중", en: "In review" },
  approved: { bg: "bg-[oklch(0.93_0.04_240)]", fg: "text-[oklch(0.40_0.13_240)]", ko: "승인", en: "Approved" },
  published: { bg: "bg-[oklch(0.92_0.06_145)]", fg: "text-[oklch(0.38_0.13_145)]", ko: "공개", en: "Published" },
};

export function MainPane() {
  const {
    tree,
    activeId,
    locale,
    can,
    bodyOverrides,
    setBody,
    setSaveState,
    setDirty,
    pushVersion,
    favorites,
    toggleFavorite,
  } = useWorkbench();
  const [editable, setEditable] = useState(true);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [findOpen, setFindOpen] = useState(false);
  const saveTimer = useRef<number | null>(null);
  const lastSavedRef = useRef<string>("");

  const node = findNode(tree, activeId);
  const content = SAMPLE_CONTENT[activeId];
  const baseBody = content?.body ?? defaultBody(activeId, node?.label ?? "");
  const body = bodyOverrides[activeId] ?? baseBody;
  const status = node?.status ?? "draft";
  const pill = STATUS_PILL[status];
  const isPdf = node?.badge === "PDF";
  const isFav = favorites.includes(activeId);

  const canEdit = can("edit");
  const effectiveEditable = editable && canEdit && !isPdf;

  const onEditor = useCallback((e: Editor | null) => setEditor(e), []);

  useEffect(() => {
    lastSavedRef.current = body;
    setDirty(activeId, false);
    setSaveState("saved");
  }, [activeId, body, setDirty, setSaveState]);

  const onUpdate = useCallback(
    (html: string) => {
      if (html === lastSavedRef.current) return;
      setDirty(activeId, true);
      setSaveState("saving");
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        if (html === lastSavedRef.current) {
          setSaveState("saved");
          setDirty(activeId, false);
          return;
        }
        lastSavedRef.current = html;
        setBody(activeId, html);
        pushVersion(activeId, html);
        setSaveState("saved");
        setDirty(activeId, false);
      }, 800);
    },
    [activeId, setBody, setDirty, setSaveState, pushVersion],
  );

  useEffect(() => {
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setFindOpen(true);
      } else if (e.key === "Escape" && findOpen) {
        setFindOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [findOpen]);

  return (
    <div className="grid min-h-0 grid-rows-[auto_1fr]">
      <WorkflowStrip />
      {isPdf ? (
        <div className="grid min-h-0 grid-rows-[auto_1fr]">
          <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-4 py-2">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-medium",
                pill.bg,
                pill.fg,
              )}
            >
              {locale === "ko" ? pill.ko : pill.en}
            </span>
            <span className="rounded bg-accent-softer px-1.5 py-px font-en text-[10.5px] font-bold text-accent">
              PDF
            </span>
            <span className="flex-1" />
            <button
              type="button"
              onClick={() => toggleFavorite(activeId)}
              className={cn(
                "grid h-7 w-7 place-items-center rounded-md border border-line bg-panel text-ink-3 hover:text-warn",
                isFav && "text-warn",
              )}
              aria-label="Favorite"
            >
              <Star size={14} className={cn(isFav && "fill-warn")} />
            </button>
          </div>
          <PdfViewer nodeId={activeId} />
          <div className="border-t border-line bg-surface px-10 py-3">
            <MustReadBar nodeId={activeId} />
          </div>
        </div>
      ) : (
        <main className="min-h-0 overflow-y-auto bg-surface">
          <div className="mx-auto max-w-[820px] px-10 py-8">
            <div className="mb-5 flex items-center gap-2">
              {node && (
                <>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-medium",
                      pill.bg,
                      pill.fg,
                    )}
                  >
                    {locale === "ko" ? pill.ko : pill.en}
                  </span>
                  {content?.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-line bg-panel px-2 py-0.5 text-[11px] text-ink-2"
                    >
                      {tag}
                    </span>
                  ))}
                  <span className="flex-1" />
                  <div className="flex items-center rounded-[var(--radius)] border border-line bg-surface-2 p-0.5">
                    <button
                      type="button"
                      onClick={() => setEditable(true)}
                      disabled={!canEdit}
                      className={cn(
                        "rounded-[5px] px-2.5 py-1 text-[12.5px] font-medium",
                        effectiveEditable
                          ? "bg-panel text-ink shadow-sm"
                          : "text-ink-3",
                        !canEdit && "cursor-not-allowed opacity-50",
                      )}
                      title={!canEdit ? "현재 역할은 편집 권한이 없습니다" : undefined}
                    >
                      {t(locale, "edit")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditable(false)}
                      className={cn(
                        "rounded-[5px] px-2.5 py-1 text-[12.5px] font-medium",
                        !effectiveEditable ? "bg-panel text-ink shadow-sm" : "text-ink-3",
                      )}
                    >
                      {t(locale, "read")}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleFavorite(activeId)}
                    className={cn(
                      "grid h-7 w-7 place-items-center rounded-md border border-line bg-panel text-ink-3 hover:text-warn",
                      isFav && "text-warn",
                    )}
                    aria-label="Favorite"
                  >
                    <Star size={14} className={cn(isFav && "fill-warn")} />
                  </button>
                  {node.hasComments ? (
                    <button
                      type="button"
                      className="flex items-center gap-1 rounded-md border border-line bg-panel px-2 py-1 text-[11.5px] text-ink-2"
                    >
                      <MessageCircle size={12} /> {node.hasComments}
                    </button>
                  ) : null}
                </>
              )}
            </div>

            {effectiveEditable && <EditorToolbar editor={editor} />}
            <FindReplaceBar
              editor={editor}
              open={findOpen}
              onClose={() => setFindOpen(false)}
            />

            <DocumentEditor
              key={activeId}
              content={body}
              editable={effectiveEditable}
              onEditor={onEditor}
              onUpdate={onUpdate}
            />

            <MustReadBar nodeId={activeId} />

            <div className="mt-6 flex items-center justify-between rounded-[var(--radius-lg)] border border-line bg-panel px-4 py-3 text-[12.5px] text-ink-3">
              <span>이 문서가 도움이 되었나요?</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  className="rounded-md border border-line bg-surface-2 px-2.5 py-1 hover:bg-surface-3"
                >
                  👍 도움이 됨
                </button>
                <button
                  type="button"
                  className="rounded-md border border-line bg-surface-2 px-2.5 py-1 hover:bg-surface-3"
                >
                  👎 보강 필요
                </button>
              </div>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
