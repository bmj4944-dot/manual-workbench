"use client";

import { useEffect } from "react";
import { useWorkbench } from "@/lib/workbench-context";

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT")
    return true;
  if (el.isContentEditable) return true;
  return false;
}

export function KeyboardShortcuts() {
  const {
    paletteOpen,
    setPaletteOpen,
    activeId,
    openTabs,
    closeTab,
    view,
    setView,
  } = useWorkbench();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if (e.key === "/" && !mod && !isTypingTarget(e.target)) {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if (mod && e.key.toLowerCase() === "w") {
        e.preventDefault();
        const tab = openTabs.find((t) => t.id === activeId);
        if (tab && !tab.pinned) closeTab(activeId);
        return;
      }
      if (e.key === "Escape") {
        if (paletteOpen) setPaletteOpen(false);
        else if (view === "search") setView("doc");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [paletteOpen, setPaletteOpen, activeId, openTabs, closeTab, view, setView]);

  return null;
}
