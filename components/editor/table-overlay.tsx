"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

type Cell = HTMLTableCellElement;

type Pos = { top: number; left: number };

export function TableEditorOverlay({
  docRef,
}: {
  docRef: RefObject<HTMLDivElement>;
}) {
  const [pos, setPos] = useState<Pos | null>(null);
  const [currentCell, setCurrentCell] = useState<Cell | null>(null);
  const [selectedCells, setSelectedCells] = useState<Cell[]>([]);
  const selectStartRef = useRef<Cell | null>(null);

  const getCellAt = (node: EventTarget | Node | null): Cell | null => {
    if (!node) return null;
    let el = node as Node;
    if (el.nodeType !== Node.ELEMENT_NODE) el = el.parentNode as Node;
    return (el as Element | null)?.closest("td, th") as Cell | null;
  };

  // Mouse drag-select across cells
  useEffect(() => {
    const doc = docRef.current;
    if (!doc) return;
    const onMouseDown = (e: MouseEvent) => {
      const cell = getCellAt(e.target);
      selectStartRef.current = cell ?? null;
    };
    const onMouseUp = (e: MouseEvent) => {
      const cell = getCellAt(e.target);
      if (cell && selectStartRef.current && cell !== selectStartRef.current) {
        const a = selectStartRef.current;
        const b = cell;
        const tbl = a.closest("table");
        if (tbl && b.closest("table") === tbl) {
          const aR = (a.parentElement as HTMLTableRowElement).rowIndex;
          const aC = a.cellIndex;
          const bR = (b.parentElement as HTMLTableRowElement).rowIndex;
          const bC = b.cellIndex;
          const r0 = Math.min(aR, bR);
          const r1 = Math.max(aR, bR);
          const c0 = Math.min(aC, bC);
          const c1 = Math.max(aC, bC);
          const all = Array.from(tbl.querySelectorAll<Cell>("td, th"));
          const sel = all.filter((c) => {
            const r = (c.parentElement as HTMLTableRowElement).rowIndex;
            return r >= r0 && r <= r1 && c.cellIndex >= c0 && c.cellIndex <= c1;
          });
          tbl
            .querySelectorAll(".cell-selected")
            .forEach((x) => x.classList.remove("cell-selected"));
          sel.forEach((c) => c.classList.add("cell-selected"));
          setSelectedCells(sel);
        }
      } else {
        doc
          .querySelectorAll(".cell-selected")
          .forEach((x) => x.classList.remove("cell-selected"));
        setSelectedCells([]);
      }
    };
    doc.addEventListener("mousedown", onMouseDown);
    doc.addEventListener("mouseup", onMouseUp);
    return () => {
      doc.removeEventListener("mousedown", onMouseDown);
      doc.removeEventListener("mouseup", onMouseUp);
    };
  }, [docRef]);

  // Watch caret to determine current cell + toolbar position
  useEffect(() => {
    const update = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) {
        setCurrentCell(null);
        setPos(null);
        return;
      }
      const node = sel.getRangeAt(0).startContainer;
      const cell = getCellAt(node);
      if (!cell || !docRef.current?.contains(cell)) {
        setCurrentCell(null);
        setPos(null);
        return;
      }
      setCurrentCell(cell);
      const tbl = cell.closest("table")!;
      const r = tbl.getBoundingClientRect();
      const parent = docRef.current.parentElement?.getBoundingClientRect();
      if (!parent) return;
      setPos({
        top:
          r.top -
          parent.top +
          (docRef.current.parentElement?.scrollTop ?? 0) -
          38,
        left: r.left - parent.left + 4,
      });
    };
    document.addEventListener("selectionchange", update);
    return () => document.removeEventListener("selectionchange", update);
  }, [docRef]);

  if (!currentCell || !pos) return null;
  const tbl = currentCell.closest("table")!;
  const targetCells =
    selectedCells.length > 1 ? selectedCells : [currentCell];

  const insertRowAbove = () => {
    const r = currentCell.parentElement as HTMLTableRowElement;
    const cols = r.children.length;
    const tr = document.createElement("tr");
    for (let i = 0; i < cols; i++) {
      const td = document.createElement("td");
      td.textContent = "내용";
      tr.appendChild(td);
    }
    r.parentElement!.insertBefore(tr, r);
  };
  const insertRowBelow = () => {
    const r = currentCell.parentElement as HTMLTableRowElement;
    const cols = r.children.length;
    const tr = document.createElement("tr");
    for (let i = 0; i < cols; i++) {
      const td = document.createElement("td");
      td.textContent = "내용";
      tr.appendChild(td);
    }
    r.parentElement!.insertBefore(tr, r.nextSibling);
  };
  const insertColLeft = () => {
    const ci = currentCell.cellIndex;
    tbl.querySelectorAll("tr").forEach((tr, ri) => {
      const tag =
        ri === 0 && tr.parentElement?.tagName === "THEAD" ? "th" : "td";
      const c = document.createElement(tag);
      c.textContent = ri === 0 ? "제목" : "내용";
      tr.insertBefore(c, tr.children[ci]);
    });
  };
  const insertColRight = () => {
    const ci = currentCell.cellIndex;
    tbl.querySelectorAll("tr").forEach((tr, ri) => {
      const tag =
        ri === 0 && tr.parentElement?.tagName === "THEAD" ? "th" : "td";
      const c = document.createElement(tag);
      c.textContent = ri === 0 ? "제목" : "내용";
      tr.insertBefore(c, tr.children[ci + 1]);
    });
  };
  const deleteRow = () => {
    const r = currentCell.parentElement as HTMLTableRowElement;
    if (r.parentElement && r.parentElement.children.length > 1) r.remove();
  };
  const deleteCol = () => {
    const ci = currentCell.cellIndex;
    tbl.querySelectorAll("tr").forEach((tr) => {
      if (tr.children.length > 1) tr.children[ci]?.remove();
    });
  };
  const mergeCells = () => {
    if (selectedCells.length < 2) return;
    const first = selectedCells[0];
    const rowSet = new Set(
      selectedCells.map(
        (c) => (c.parentElement as HTMLTableRowElement).rowIndex,
      ),
    );
    const colSet = new Set(selectedCells.map((c) => c.cellIndex));
    first.rowSpan = rowSet.size;
    first.colSpan = colSet.size;
    const txt = selectedCells
      .map((c) => c.textContent)
      .filter(Boolean)
      .join(" ");
    first.textContent = txt;
    selectedCells.slice(1).forEach((c) => c.remove());
    selectedCells.forEach((c) => c.classList.remove("cell-selected"));
    setSelectedCells([]);
  };
  const splitCell = () => {
    const c = currentCell;
    if (c.rowSpan > 1 || c.colSpan > 1) {
      const cs = c.colSpan;
      c.rowSpan = 1;
      c.colSpan = 1;
      for (let i = 1; i < cs; i++) {
        const nc = document.createElement(c.tagName.toLowerCase());
        nc.textContent = "";
        c.parentElement!.insertBefore(nc, c.nextSibling);
      }
    }
  };
  const sortByCol = (dir: "asc" | "desc") => {
    const ci = currentCell.cellIndex;
    const tbody = tbl.querySelector("tbody") ?? tbl;
    const rows = Array.from(tbody.querySelectorAll("tr")).filter(
      (r) => !r.querySelector("th"),
    );
    rows.sort((a, b) => {
      const av = a.children[ci]?.textContent ?? "";
      const bv = b.children[ci]?.textContent ?? "";
      const an = parseFloat(av);
      const bn = parseFloat(bv);
      let r: number;
      if (!isNaN(an) && !isNaN(bn)) r = an - bn;
      else r = av.localeCompare(bv, "ko-KR");
      return dir === "desc" ? -r : r;
    });
    rows.forEach((r) => tbody.appendChild(r));
    const ths = tbl.querySelectorAll("th");
    ths.forEach((th) => th.classList.remove("sort-asc", "sort-desc"));
    const headCell = tbl.querySelector("thead tr")?.children[ci];
    if (headCell)
      headCell.classList.add(dir === "asc" ? "sort-asc" : "sort-desc");
  };
  const alignCell = (a: "left" | "center" | "right") => {
    targetCells.forEach((c) => {
      c.style.textAlign = a;
    });
  };
  const deleteTable = () => {
    if (!confirm("이 표를 삭제할까요?")) return;
    tbl.remove();
    setCurrentCell(null);
    setPos(null);
  };

  const canMerge = selectedCells.length >= 2;

  return (
    <div
      className="tbl-toolbar"
      style={{ top: pos.top, left: pos.left, position: "absolute" }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <button title="위에 행 추가" onClick={insertRowAbove}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.3}
        >
          <rect x="2" y="6" width="10" height="6" />
          <line x1="2" y1="9" x2="12" y2="9" />
          <path
            d="M7 4V2M5 2.5l2-1.5 2 1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <button title="아래 행 추가" onClick={insertRowBelow}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.3}
        >
          <rect x="2" y="2" width="10" height="6" />
          <line x1="2" y1="5" x2="12" y2="5" />
          <path
            d="M7 10v2M5 11.5l2 1.5 2-1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <button title="왼쪽 열 추가" onClick={insertColLeft}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.3}
        >
          <rect x="6" y="2" width="6" height="10" />
          <line x1="9" y1="2" x2="9" y2="12" />
          <path
            d="M4 7H2M2.5 5l-1.5 2 1.5 2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <button title="오른쪽 열 추가" onClick={insertColRight}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.3}
        >
          <rect x="2" y="2" width="6" height="10" />
          <line x1="5" y1="2" x2="5" y2="12" />
          <path
            d="M10 7h2M11.5 5l1.5 2-1.5 2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <div className="sep" />
      <button
        title="셀 병합"
        onClick={mergeCells}
        disabled={!canMerge}
        style={{ opacity: canMerge ? 1 : 0.3 }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.3}
        >
          <rect x="1.5" y="2" width="5" height="10" />
          <rect x="7.5" y="2" width="5" height="10" />
          <path
            d="M5 7h4M7 5l2 2-2 2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <button title="셀 분할" onClick={splitCell}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.3}
        >
          <rect x="1.5" y="2" width="11" height="10" />
          <path
            d="M7 4l-2 3 2 3M7 4l2 3-2 3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <div className="sep" />
      <button title="오름차순 정렬" onClick={() => sortByCol("asc")}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.3}
        >
          <path
            d="M3 11V3M1 5l2-2 2 2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <line x1="7" y1="4" x2="12" y2="4" />
          <line x1="7" y1="7" x2="11" y2="7" />
          <line x1="7" y1="10" x2="10" y2="10" />
        </svg>
      </button>
      <button title="내림차순 정렬" onClick={() => sortByCol("desc")}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.3}
        >
          <path
            d="M3 3v8M1 9l2 2 2-2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <line x1="7" y1="4" x2="12" y2="4" />
          <line x1="7" y1="7" x2="11" y2="7" />
          <line x1="7" y1="10" x2="10" y2="10" />
        </svg>
      </button>
      <div className="sep" />
      <button title="왼쪽 정렬" onClick={() => alignCell("left")}>
        <svg
          width="12"
          height="12"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.4}
          strokeLinecap="round"
        >
          <line x1="2" y1="3" x2="12" y2="3" />
          <line x1="2" y1="7" x2="9" y2="7" />
          <line x1="2" y1="11" x2="11" y2="11" />
        </svg>
      </button>
      <button title="가운데" onClick={() => alignCell("center")}>
        <svg
          width="12"
          height="12"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.4}
          strokeLinecap="round"
        >
          <line x1="2" y1="3" x2="12" y2="3" />
          <line x1="3.5" y1="7" x2="10.5" y2="7" />
          <line x1="2.5" y1="11" x2="11.5" y2="11" />
        </svg>
      </button>
      <button title="오른쪽" onClick={() => alignCell("right")}>
        <svg
          width="12"
          height="12"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.4}
          strokeLinecap="round"
        >
          <line x1="2" y1="3" x2="12" y2="3" />
          <line x1="5" y1="7" x2="12" y2="7" />
          <line x1="3" y1="11" x2="12" y2="11" />
        </svg>
      </button>
      <div className="sep" />
      <button title="행 삭제" onClick={deleteRow}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.3}
        >
          <rect x="2" y="4" width="10" height="6" />
          <line x1="2" y1="7" x2="12" y2="7" />
          <line
            x1="4"
            y1="12"
            x2="10"
            y2="12"
            strokeLinecap="round"
            stroke="oklch(0.55 0.18 25)"
          />
        </svg>
      </button>
      <button title="열 삭제" onClick={deleteCol}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.3}
        >
          <rect x="4" y="2" width="6" height="10" />
          <line x1="7" y1="2" x2="7" y2="12" />
          <line
            x1="12"
            y1="4"
            x2="12"
            y2="10"
            strokeLinecap="round"
            stroke="oklch(0.55 0.18 25)"
          />
        </svg>
      </button>
      <button title="표 삭제" className="danger" onClick={deleteTable}>
        <svg
          width="11"
          height="11"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
        >
          <line x1="3.5" y1="3.5" x2="10.5" y2="10.5" />
          <line x1="10.5" y1="3.5" x2="3.5" y2="10.5" />
        </svg>
      </button>
    </div>
  );
}
