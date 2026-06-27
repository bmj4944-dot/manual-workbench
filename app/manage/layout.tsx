import { redirect } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

/**
 * /manage/* (콘텐츠 관리) 진입 시 1차 검증. /admin 과 달리 콘텐츠(사례·FAQ·
 * 온보딩)는 approve 권한자(admin·reviewer)에게 열어둔다. 각 server action 도
 * requirePermission(role, "approve") 로 다시 검증하므로 이중 방어.
 *
 * /admin 레이아웃과 분리한 이유: /admin 은 "사람·시스템 관리"(admin 전용)라
 * 게이트를 풀면 users/teams/audit 까지 노출된다. 콘텐츠 관리는 권한 경계가
 * 달라 별도 세그먼트로 둔다.
 */
const MANAGE_NAV: { href: string; label: string }[] = [
  { href: "/manage/cases", label: "사례" },
  { href: "/manage/faq", label: "FAQ" },
  { href: "/manage/onboarding", label: "온보딩" },
];

export default async function ManageLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/manage/cases");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  const role = (profile as { role?: Role } | null)?.role;
  if (role !== "admin" && role !== "reviewer") redirect("/");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--surface)",
        color: "var(--ink)",
        fontFamily: "inherit",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "12px 20px",
          borderBottom: "1px solid var(--line)",
          background: "var(--panel)",
        }}
      >
        <Link
          href="/"
          style={{ fontSize: 12, color: "var(--ink-3)", textDecoration: "none" }}
        >
          ← 워크벤치로
        </Link>
        <span style={{ color: "var(--line)" }}>·</span>
        <h1 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>콘텐츠 관리</h1>
        <nav style={{ marginLeft: 16, display: "flex", gap: 12 }}>
          {MANAGE_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                fontSize: 12.5,
                color: "var(--ink-2)",
                textDecoration: "none",
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main style={{ padding: "24px 20px" }}>{children}</main>
    </div>
  );
}
