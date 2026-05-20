"use client";

import { useTheme } from "next-themes";
import { Check, Loader2, LogOut, Moon, Search, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { NotificationsBell } from "./notifications-popover";
import { ViewSwitcher } from "./view-switcher";
import { useEffect, useState } from "react";
import { useWorkbench, findPath } from "@/lib/workbench-context";
import { createClient } from "@/lib/supabase/client";
import { ROLE_LABELS } from "@/lib/sample-data";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function Topbar() {
  const {
    tree,
    activeId,
    locale,
    setLocale,
    openSearch,
    setPaletteOpen,
    view,
    setView,
    role,
    saveState,
    members,
    currentUser,
  } = useWorkbench();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [draft, setDraft] = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const onSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  };
  useEffect(() => setMounted(true), []);

  const path = findPath(tree, activeId);
  const label = (n: { label: string; labelEn?: string }) =>
    locale === "ko" ? n.label : n.labelEn ?? n.label;

  return (
    <header
      className="flex items-center gap-3.5 border-b border-line bg-panel px-4"
      style={{ height: "var(--topbar-h)" }}
    >
      <button
        type="button"
        onClick={() => setView("doc")}
        className="flex items-center gap-2.5"
      >
        <div
          className="grid h-[26px] w-[26px] place-items-center rounded-[7px] text-white font-bold text-[13px] font-en shadow-sm"
          style={{
            background:
              "linear-gradient(135deg, var(--accent), oklch(0.45 0.13 30))",
          }}
        >
          M
        </div>
        <div className="flex flex-col items-start leading-tight">
          <span className="font-bold text-[15px] tracking-tighter1">
            {t(locale, "appName")}
          </span>
          <span className="text-[10.5px] font-en font-medium tracking-[0.06em] uppercase text-ink-3">
            {t(locale, "appSub")}
          </span>
        </div>
      </button>

      <span className="h-[22px] w-px bg-line" />

      <ViewSwitcher />

      <span className="h-[22px] w-px bg-line" />

      <nav className="flex min-w-0 items-center gap-1.5 text-[13px] text-ink-3">
        {view === "search" ? (
          <span className="text-ink font-medium">전체 검색</span>
        ) : (
          path.map((n, i) => (
            <span key={n.id} className="flex items-center gap-1.5">
              {i > 0 && <span className="font-en text-ink-4">/</span>}
              <span
                className={cn(
                  "truncate max-w-[240px]",
                  i === path.length - 1 && "text-ink font-medium",
                )}
              >
                {label(n)}
              </span>
            </span>
          ))
        )}
      </nav>

      <div className="flex-1" />

      <div
        className={cn(
          "flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px]",
          saveState === "saved"
            ? "border-line bg-surface-2 text-ink-3"
            : "border-[oklch(0.80_0.12_75/0.6)] bg-[oklch(0.96_0.05_75/0.6)] text-warn",
        )}
        title={saveState === "saved" ? "자동 저장됨" : "저장 중..."}
      >
        {saveState === "saved" ? (
          <>
            <Check size={11} /> 자동 저장됨
          </>
        ) : (
          <>
            <Loader2 size={11} className="animate-spin" /> 저장 중...
          </>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const q = draft.trim();
          if (q) {
            openSearch(q);
            setDraft("");
          } else {
            setPaletteOpen(true);
          }
        }}
        className="flex w-[260px] items-center gap-2 rounded-[var(--radius)] border border-line bg-surface-2 px-2.5 py-1.5 text-ink-3 focus-within:border-accent focus-within:bg-panel"
      >
        <Search size={14} />
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t(locale, "searchPlaceholder")}
          className="min-w-0 flex-1 border-0 bg-transparent text-ink outline-none placeholder:text-ink-4"
        />
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="rounded border border-line bg-panel px-1.5 py-px font-en text-[10.5px] text-ink-3 hover:bg-surface-2"
          title="빠른 이동"
        >
          ⌘K
        </button>
      </form>

      <span
        className="rounded-[var(--radius)] border border-line bg-surface-2 px-2 py-1 text-[12px] font-medium text-ink-2"
        title="현재 본인의 권한 (관리자가 변경 가능)"
      >
        {locale === "ko" ? ROLE_LABELS[role].ko : ROLE_LABELS[role].en}
      </span>

      <div className="flex">
        {members.slice(0, 4).map((m, i) => (
          <span
            key={m.id}
            className="grid h-[26px] w-[26px] place-items-center rounded-full border-2 border-panel font-en text-[11px] font-semibold text-white"
            style={{ background: m.color, marginLeft: i === 0 ? 0 : -6 }}
            title={`${m.name} (${ROLE_LABELS[m.role].ko})`}
          >
            {m.initials}
          </span>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setLocale(locale === "ko" ? "en" : "ko")}
        className="rounded-[var(--radius)] border border-line bg-panel px-2.5 py-1 text-[12px] font-medium text-ink-2 hover:bg-surface-2"
        title={locale === "ko" ? t("ko", "english") : t("en", "korean")}
      >
        {locale === "ko" ? "KO" : "EN"}
      </button>

      <button
        type="button"
        onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        className="grid h-8 w-8 place-items-center rounded-[7px] border border-line bg-panel text-ink-2 hover:bg-surface-2 hover:text-ink"
        aria-label="Toggle theme"
      >
        {mounted && resolvedTheme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
      </button>

      <NotificationsBell />

      {currentUser && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setUserMenuOpen((v) => !v)}
            className="grid h-8 w-8 place-items-center rounded-full font-en text-[12px] font-semibold text-white"
            style={{ background: currentUser.color }}
            title={currentUser.name}
          >
            {currentUser.initials}
          </button>
          {userMenuOpen && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-10 cursor-default"
                onClick={() => setUserMenuOpen(false)}
                aria-label="close"
              />
              <div className="absolute right-0 top-10 z-20 w-[220px] rounded-md border border-line bg-panel py-1.5 shadow-md">
                <div className="border-b border-line px-3 pb-2 pt-1">
                  <div className="text-[12.5px] font-semibold text-ink">
                    {currentUser.name}
                  </div>
                  <div className="text-[11px] text-ink-3">{currentUser.email}</div>
                  <div className="mt-1 text-[10.5px] text-ink-3">
                    {ROLE_LABELS[currentUser.role].ko}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onSignOut}
                  className="mt-1 flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12.5px] text-ink-2 hover:bg-surface-2"
                >
                  <LogOut size={12} /> 로그아웃
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </header>
  );
}
