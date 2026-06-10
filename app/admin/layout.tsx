import { redirect } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

/**
 * /admin/* 진입 시 1차 검증. middleware 는 auth 만 본다. 여기서 profiles.role
 * 까지 확인해 admin 아니면 홈으로 돌려보낸다. server action 들은 자체적으로
 * requireAdmin 으로 다시 검증하므로 이중 방어.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  const role = (profile as { role?: Role } | null)?.role;
  if (role !== "admin") redirect("/");

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
          style={{
            fontSize: 12,
            color: "var(--ink-3)",
            textDecoration: "none",
          }}
        >
          ← 워크벤치로
        </Link>
        <span style={{ color: "var(--line)" }}>·</span>
        <h1 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>
          관리자 콘솔
        </h1>
        <nav style={{ marginLeft: 16, display: "flex", gap: 12 }}>
          <Link
            href="/admin/users"
            style={{
              fontSize: 12.5,
              color: "var(--ink-2)",
              textDecoration: "none",
            }}
          >
            사용자
          </Link>
          <Link
            href="/admin/teams"
            style={{
              fontSize: 12.5,
              color: "var(--ink-2)",
              textDecoration: "none",
            }}
          >
            팀
          </Link>
          <Link
            href="/admin/audit"
            style={{
              fontSize: 12.5,
              color: "var(--ink-2)",
              textDecoration: "none",
            }}
          >
            감사 로그
          </Link>
        </nav>
      </header>
      <main style={{ padding: "24px 20px" }}>{children}</main>
    </div>
  );
}
