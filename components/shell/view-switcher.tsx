"use client";

import {
  BookOpen,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  MessagesSquare,
} from "lucide-react";
import { useWorkbench } from "@/lib/workbench-context";
import type { View } from "@/lib/workbench-context";
import { cn } from "@/lib/utils";

const VIEWS: { key: Exclude<View, "search">; ko: string; en: string; Icon: typeof BookOpen }[] = [
  { key: "doc", ko: "문서", en: "Docs", Icon: BookOpen },
  { key: "dashboard", ko: "대시보드", en: "Dashboard", Icon: LayoutDashboard },
  { key: "cases", ko: "사례", en: "Cases", Icon: MessagesSquare },
  { key: "faq", ko: "FAQ", en: "FAQ", Icon: HelpCircle },
  { key: "onboarding", ko: "온보딩", en: "Onboarding", Icon: GraduationCap },
];

export function ViewSwitcher() {
  const { view, setView, locale } = useWorkbench();
  return (
    <nav className="flex items-center gap-0.5 rounded-[var(--radius)] border border-line bg-surface-2 p-0.5">
      {VIEWS.map(({ key, ko, en, Icon }) => {
        const active =
          view === key || (key === "doc" && view === "search");
        return (
          <button
            key={key}
            type="button"
            onClick={() => setView(key)}
            className={cn(
              "flex items-center gap-1.5 rounded-[5px] px-2 py-1 text-[12px] font-medium",
              active
                ? "bg-panel text-ink shadow-sm"
                : "text-ink-3 hover:text-ink",
            )}
            title={locale === "ko" ? ko : en}
          >
            <Icon size={13} />
            <span className="hidden sm:inline">
              {locale === "ko" ? ko : en}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

