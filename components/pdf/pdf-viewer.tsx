"use client";

import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Upload,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useWorkbench } from "@/lib/workbench-context";
import { uploadPdfAction } from "@/lib/actions/pdf";
import { cn } from "@/lib/utils";

type Props = {
  nodeId: string;
};

type Mode = "sample" | "rendered";

// pdfjs-dist loaded lazily on the client (heavy + uses workers)
type PdfDoc = {
  numPages: number;
  getPage: (n: number) => Promise<PdfPage>;
};
type PdfPage = {
  getViewport: (o: { scale: number }) => { width: number; height: number };
  render: (o: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => {
    promise: Promise<void>;
  };
};

async function loadPdfjs() {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  return pdfjs;
}

export function PdfViewer({ nodeId }: Props) {
  const { content, can } = useWorkbench();
  const docContent = content[nodeId];
  const storedPath = docContent?.pdfStoragePath;
  const meta = {
    title: docContent?.pdfTitle ?? "첨부 PDF",
    pages: docContent?.pdfPages ?? 1,
  };
  const [mode, setMode] = useState<Mode>("sample");
  const [doc, setDoc] = useState<PdfDoc | null>(null);
  const [page, setPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.25);
  const [loading, setLoading] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [err, setErr] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const canEdit = can("edit");

  const total = mode === "sample" ? meta.pages : doc?.numPages ?? 0;

  // Reset when node changes
  useEffect(() => {
    setMode("sample");
    setDoc(null);
    setPage(1);
    setScale(1.25);
    setErr(null);
  }, [nodeId]);

  // Auto-load stored PDF for this document
  useEffect(() => {
    if (!storedPath) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const pdfjs = await loadPdfjs();
        const url = `/api/pdf/${encodeURIComponent(nodeId)}`;
        const loaded = (await pdfjs.getDocument({ url }).promise) as unknown as PdfDoc;
        if (cancelled) return;
        setDoc(loaded);
        setMode("rendered");
        setPage(1);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "PDF 로드 실패");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storedPath, nodeId]);

  const renderPage = useCallback(
    async (p: number) => {
      if (mode !== "rendered" || !doc) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      try {
        const pageObj = await doc.getPage(p);
        const viewport = pageObj.getViewport({ scale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        await pageObj.render({ canvasContext: ctx, viewport }).promise;
      } catch (e) {
        setErr(e instanceof Error ? e.message : "PDF 렌더 실패");
      }
    },
    [mode, doc, scale],
  );

  useEffect(() => {
    if (mode === "rendered") renderPage(page);
  }, [page, renderPage, mode]);

  // Upload a file → render locally + persist to Supabase Storage
  const onFile = useCallback(
    async (file: File) => {
      if (!canEdit) {
        setErr("편집 권한이 없어 업로드할 수 없습니다.");
        return;
      }
      setLoading(true);
      setUploading(true);
      setErr(null);
      try {
        const pdfjs = await loadPdfjs();
        const buf = await file.arrayBuffer();
        const loaded = (await pdfjs.getDocument({ data: buf }).promise) as unknown as PdfDoc;
        setDoc(loaded);
        setMode("rendered");
        setPage(1);

        const fd = new FormData();
        fd.set("file", file);
        fd.set("pageCount", String(loaded.numPages));
        await uploadPdfAction(nodeId, fd);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "PDF 업로드 실패");
      } finally {
        setLoading(false);
        setUploading(false);
      }
    },
    [canEdit, nodeId],
  );

  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;
    const prevent = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const drop = (e: DragEvent) => {
      prevent(e);
      const f = e.dataTransfer?.files?.[0];
      if (f && f.type === "application/pdf") onFile(f);
    };
    el.addEventListener("dragenter", prevent);
    el.addEventListener("dragover", prevent);
    el.addEventListener("drop", drop);
    return () => {
      el.removeEventListener("dragenter", prevent);
      el.removeEventListener("dragover", prevent);
      el.removeEventListener("drop", drop);
    };
  }, [onFile]);

  return (
    <div className="grid h-full min-h-0 grid-cols-[180px_1fr] bg-surface">
      {/* Thumbnail strip */}
      <aside className="flex min-h-0 flex-col overflow-y-auto border-r border-line bg-surface-2 px-2 py-3">
        <div className="mb-2 px-1 text-[10.5px] font-en font-bold uppercase tracking-[0.08em] text-ink-3">
          페이지
        </div>
        <ul className="flex flex-col gap-1.5">
          {Array.from({ length: total }, (_, i) => i + 1).map((p) => (
            <li key={p}>
              <button
                type="button"
                onClick={() => setPage(p)}
                className={cn(
                  "block w-full rounded-md border border-line bg-panel p-1.5 text-left hover:border-accent",
                  page === p && "border-accent shadow-sm",
                )}
              >
                <div className="grid aspect-[1/1.4] place-items-center rounded-sm bg-surface-2 text-[11px] text-ink-3">
                  {mode === "sample" ? (
                    <span>p.{p}</span>
                  ) : (
                    <FileText size={16} />
                  )}
                </div>
                <div className="mt-1 text-center font-mono text-[10.5px] text-ink-3">
                  {p}
                </div>
              </button>
            </li>
          ))}
        </ul>
        {canEdit && (
          <label className="mt-3 flex cursor-pointer items-center justify-center gap-1.5 rounded-md border border-dashed border-line bg-panel p-2 text-[11.5px] text-ink-3 hover:border-accent hover:text-accent">
            <Upload size={12} />
            {storedPath ? "PDF 교체" : "PDF 업로드"}
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </aside>

      {/* Main viewer */}
      <section className="flex min-h-0 flex-col">
        <div className="flex items-center gap-2 border-b border-line bg-panel px-4 py-2">
          <div className="text-[12.5px] font-medium text-ink">
            {meta.title}
          </div>
          <span
            className={cn(
              "rounded-full px-1.5 py-px font-en text-[10px] font-bold",
              mode === "sample"
                ? "bg-surface-2 text-ink-3"
                : storedPath
                ? "bg-ok/15 text-ok"
                : "bg-accent-soft text-accent",
            )}
          >
            {mode === "sample" ? "SAMPLE" : storedPath ? "STORED" : "UPLOADED"}
          </span>
          {uploading && (
            <span className="font-mono text-[10.5px] text-ink-3">업로드 중...</span>
          )}
          <span className="flex-1" />
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="grid h-7 w-7 place-items-center rounded-md border border-line bg-panel text-ink-2 hover:bg-surface-2 disabled:opacity-40"
            aria-label="이전 페이지"
          >
            <ChevronLeft size={14} />
          </button>
          <input
            type="number"
            min={1}
            max={total}
            value={page}
            onChange={(e) =>
              setPage(Math.max(1, Math.min(total, Number(e.target.value))))
            }
            className="w-12 rounded-md border border-line bg-surface-2 px-1.5 py-0.5 text-center font-mono text-[12px] text-ink outline-none focus:border-accent"
          />
          <span className="font-mono text-[12px] text-ink-3">/ {total}</span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(total, p + 1))}
            disabled={page >= total}
            className="grid h-7 w-7 place-items-center rounded-md border border-line bg-panel text-ink-2 hover:bg-surface-2 disabled:opacity-40"
            aria-label="다음 페이지"
          >
            <ChevronRight size={14} />
          </button>
          <span className="mx-1 h-5 w-px bg-line" />
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(0.5, +(s - 0.25).toFixed(2)))}
            className="grid h-7 w-7 place-items-center rounded-md border border-line bg-panel text-ink-2 hover:bg-surface-2"
            aria-label="축소"
          >
            <ZoomOut size={14} />
          </button>
          <span className="font-mono text-[11.5px] text-ink-3">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setScale((s) => Math.min(3, +(s + 0.25).toFixed(2)))}
            className="grid h-7 w-7 place-items-center rounded-md border border-line bg-panel text-ink-2 hover:bg-surface-2"
            aria-label="확대"
          >
            <ZoomIn size={14} />
          </button>
        </div>

        <div
          ref={dropRef}
          className="min-h-0 flex-1 overflow-auto bg-surface-3 p-6"
        >
          <div className="mx-auto" style={{ width: "fit-content" }}>
            {err && (
              <div className="mb-3 rounded-md border border-[oklch(0.80_0.18_28_/_0.5)] bg-[oklch(0.95_0.06_28_/_0.4)] px-3 py-2 text-[12px] text-[oklch(0.45_0.18_28)]">
                {err}
              </div>
            )}
            {mode === "sample" ? (
              <SamplePage
                page={page}
                total={total}
                title={meta.title}
                scale={scale}
              />
            ) : loading ? (
              <div className="rounded-md bg-panel px-6 py-12 text-[13px] text-ink-3 shadow-md">
                불러오는 중...
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                className="rounded-sm bg-white shadow-md"
              />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function SamplePage({
  page,
  total,
  title,
  scale,
}: {
  page: number;
  total: number;
  title: string;
  scale: number;
}) {
  const w = 612 * scale;
  const h = 792 * scale;
  return (
    <div
      className="flex flex-col rounded-sm bg-white shadow-md"
      style={{ width: w, minHeight: h, fontFamily: "Inter, sans-serif" }}
    >
      <div className="border-b border-zinc-200 px-10 py-6 text-[10px] uppercase tracking-[0.12em] text-zinc-400">
        Manual Workbench — Sample PDF
      </div>
      <div className="flex flex-1 flex-col gap-4 px-10 py-10 text-zinc-700">
        <h1 className="text-[24px] font-bold text-zinc-900">{title}</h1>
        <div className="text-[12px] text-zinc-500">
          Page {page} / {total}
        </div>
        <p className="text-[14px] leading-relaxed">
          이 영역은 실제 PDF가 업로드되기 전 보여주는 샘플 페이지입니다.
          왼쪽 사이드바의 <strong>PDF 업로드</strong> 버튼이나 이 영역에 PDF
          파일을 드롭하면 pdf.js로 실제 페이지가 렌더되고 Supabase Storage에 저장됩니다.
        </p>
        <ul className="ml-5 list-disc text-[13px] leading-relaxed text-zinc-600">
          <li>페이지 입력으로 이동, ↔ 화살표로 직접 이동</li>
          <li>±25% 단위 줌, 50%~300% 범위</li>
          <li>드래그-드롭 또는 업로드 버튼으로 PDF 교체</li>
        </ul>
        <div className="mt-auto pt-6 text-right text-[10px] text-zinc-400">
          {title} · {page}/{total}
        </div>
      </div>
    </div>
  );
}
