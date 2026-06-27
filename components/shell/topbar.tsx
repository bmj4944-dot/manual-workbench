"use client";

import { useTheme } from "next-themes";
import {
  Eye,
  GraduationCap,
  HelpCircle,
  Layers,
  LibraryBig,
  LogOut,
  MessagesSquare,
  Moon,
  PenLine,
  Search,
  ShieldCheck,
  Sun,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NotificationsBell } from "./notifications-popover";
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
    setPaletteOpen,
    view,
    setView,
    role,
    saveState,
    members,
    currentUser,
    mode,
    setMode,
    searchQuery,
  } = useWorkbench();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
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
    <header className="topbar">
      <button
        type="button"
        className="brand"
        onClick={() => setView("doc")}
        style={{ background: "transparent", border: 0, padding: 0, cursor: "pointer" }}
      >
        <div className="logo">M</div>
        <div className="meta">
          <span>{t(locale, "appName")}</span>
          <small>{t(locale, "appSub")}</small>
        </div>
      </button>

      <div className="sep" />

      {view === "doc" ? (
        <div className="crumbs">
          {path.map((n, i) => (
            <span key={n.id} className="contents">
              {i > 0 && <span className="slash">/</span>}
              <button
                type="button"
                className={cn("seg", i === path.length - 1 && "current")}
                style={{ background: "transparent", border: 0, padding: 0, cursor: "pointer" }}
              >
                {label(n)}
              </button>
            </span>
          ))}
        </div>
      ) : view === "search" ? (
        <div className="crumbs">
          <span className="seg current">{locale === "ko" ? "전체 검색" : "Search"}</span>
          {searchQuery && (
            <>
              <span className="slash">/</span>
              <span className="seg">&quot;{searchQuery}&quot;</span>
            </>
          )}
        </div>
      ) : view === "dashboard" ? (
        <div className="crumbs">
          <span className="seg current">
            {locale === "ko" ? "관리 대시보드" : "Admin Dashboard"}
          </span>
        </div>
      ) : view === "cases" ? (
        <div className="crumbs">
          <span className="seg current">
            {locale === "ko" ? "응대 사례 라이브러리" : "Case Library"}
          </span>
        </div>
      ) : view === "onboarding" ? (
        <div className="crumbs">
          <span className="seg current">
            {locale === "ko" ? "신입 온보딩" : "Onboarding"}
          </span>
        </div>
      ) : view === "faq" ? (
        <div className="crumbs">
          <span className="seg current">FAQ</span>
        </div>
      ) : null}

      <div className="spacer" />

      <button
        type="button"
        className={cn("nav-btn", view === "dashboard" && "on")}
        onClick={() => setView("dashboard")}
      >
        <Layers size={11} />
        {locale === "ko" ? "대시보드" : "Dashboard"}
      </button>
      <button
        type="button"
        className={cn("nav-btn", view === "cases" && "on")}
        onClick={() => setView("cases")}
      >
        <MessagesSquare size={11} />
        {locale === "ko" ? "사례" : "Cases"}
      </button>
      <button
        type="button"
        className={cn("nav-btn", view === "faq" && "on")}
        onClick={() => setView("faq")}
      >
        <HelpCircle size={11} />
        FAQ
      </button>
      <button
        type="button"
        className={cn("nav-btn", view === "onboarding" && "on")}
        onClick={() => setView("onboarding")}
      >
        <GraduationCap size={11} />
        {locale === "ko" ? "온보딩" : "Onboarding"}
      </button>

      <div
        className="search"
        onClick={() => setPaletteOpen(true)}
        style={{ cursor: "pointer" }}
      >
        <Search size={12} />
        <input
          placeholder={t(locale, "searchPlaceholder")}
          readOnly
          onFocus={() => setPaletteOpen(true)}
        />
        <kbd>/</kbd>
        <kbd>⌘K</kbd>
      </div>

      <div className="mode-switch">
        <button
          type="button"
          className={mode === "edit" ? "on" : ""}
          onClick={() => setMode("edit")}
        >
          <PenLine size={11} /> {locale === "ko" ? "편집" : "Edit"}
        </button>
        <button
          type="button"
          className={mode === "read" ? "on" : ""}
          onClick={() => setMode("read")}
        >
          <Eye size={11} /> {locale === "ko" ? "읽기" : "Read"}
        </button>
      </div>

      <div className={cn("save-state", saveState === "saving" && "saving")}>
        <span className="dot" />
        <span>{saveState === "saving" ? "저장 중..." : "자동 저장됨"}</span>
      </div>

      <div className="role-switch" title="현재 본인의 권한">
        <div
          className="role-av"
          style={{ background: currentUser?.color ?? "var(--accent)" }}
        >
          {currentUser?.initials ?? "?"}
        </div>
        <span>{ROLE_LABELS[role].ko}</span>
      </div>

      <div className="avatars">
        {members.slice(0, 3).map((m) => (
          <div
            key={m.id}
            className="av"
            style={{ background: m.color }}
            title={m.name}
          >
            {m.initials}
          </div>
        ))}
      </div>

      <button
        type="button"
        className="icon-btn"
        onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        aria-label="Toggle theme"
      >
        {mounted && resolvedTheme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
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
                {(currentUser.role === "admin" ||
                  currentUser.role === "reviewer") && (
                  <Link
                    href="/manage"
                    className="mt-1 flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12.5px] text-ink-2 hover:bg-surface-2"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <LibraryBig size={12} /> 관리
                  </Link>
                )}
                {currentUser.role === "admin" && (
                  <Link
                    href="/admin/users"
                    className="mt-1 flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12.5px] text-ink-2 hover:bg-surface-2"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <ShieldCheck size={12} /> 관리자 콘솔
                  </Link>
                )}
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
