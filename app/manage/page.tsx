import type { CSSProperties } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fetchManageCounts } from "@/lib/data/manage";
import type { Role } from "@/lib/types";

export const dynamic = "force-dynamic";

type Card = {
  title: string;
  desc: string;
  href: string | null; // null = 준비 중
  count: number | null;
};

export default async function ManageHubPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("role")
        .eq("auth_user_id", user.id)
        .maybeSingle()
    : { data: null };
  const role = (profile as { role?: Role } | null)?.role;
  const isAdmin = role === "admin";

  const counts = await fetchManageCounts();

  const content: Card[] = [
    {
      title: "사례",
      desc: "응대 사례 라이브러리 — 대화록·교훈",
      href: "/manage/cases",
      count: counts.cases,
    },
    {
      title: "FAQ",
      desc: "자주 묻는 질문 — 답변·신뢰도·출처",
      href: "/manage/faq",
      count: counts.faqs,
    },
    {
      title: "온보딩",
      desc: "신입 과정 — 필독·퀴즈·실습",
      href: "/manage/onboarding",
      count: counts.onboarding,
    },
    {
      title: "임베드",
      desc: "본문 CRM 티켓·상품 카탈로그",
      href:
        counts.tickets == null && counts.products == null
          ? null
          : "/manage/embeds",
      count:
        counts.tickets == null && counts.products == null
          ? null
          : (counts.tickets ?? 0) + (counts.products ?? 0),
    },
    {
      title: "공지",
      desc: "What's New 운영 공지",
      href: null,
      count: null,
    },
  ];

  const ops: Card[] = [
    {
      title: "필독 · 검증 · 분류",
      desc: "문서 워크플로 스트립에서 필독·검증 주기·민감도·가시성 관리",
      href: "/",
      count: null,
    },
  ];

  const system: Card[] = [
    { title: "사용자", desc: "역할·초대·비활성화", href: "/admin/users", count: null },
    { title: "팀", desc: "팀/부서 · 멤버 배정", href: "/admin/teams", count: null },
    { title: "감사 로그", desc: "변경 이력 추적", href: "/admin/audit", count: null },
  ];

  return (
    <div style={{ maxWidth: 980, margin: "0 auto" }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, margin: "4px 0 4px" }}>
        관리 허브
      </h2>
      <p style={{ fontSize: 13, color: "var(--ink-3)", margin: "0 0 24px" }}>
        콘텐츠와 운영 데이터를 한 곳에서 관리합니다.
      </p>

      <Section title="콘텐츠" cards={content} />
      <Section title="운영" cards={ops} />
      {isAdmin ? <Section title="시스템" cards={system} /> : null}
    </div>
  );
}

function Section({ title, cards }: { title: string; cards: Card[] }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h3
        style={{
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: 0.4,
          textTransform: "uppercase",
          color: "var(--ink-3)",
          margin: "0 0 10px",
        }}
      >
        {title}
      </h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 12,
        }}
      >
        {cards.map((c) => (
          <ManageCard key={c.title} card={c} />
        ))}
      </div>
    </section>
  );
}

function ManageCard({ card }: { card: Card }) {
  const inner = (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 6,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>
          {card.title}
        </span>
        {card.count != null ? (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--accent)",
              background: "color-mix(in oklch, var(--accent) 12%, transparent)",
              borderRadius: 10,
              padding: "1px 8px",
            }}
          >
            {card.count}
          </span>
        ) : null}
        {!card.href ? (
          <span style={{ fontSize: 10.5, color: "var(--ink-3)" }}>준비 중</span>
        ) : null}
      </div>
      <div style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>
        {card.desc}
      </div>
    </>
  );

  const style: CSSProperties = {
    display: "block",
    padding: 14,
    border: "1px solid var(--line)",
    borderRadius: 8,
    background: "var(--panel)",
    textDecoration: "none",
    opacity: card.href ? 1 : 0.55,
  };

  if (!card.href) return <div style={style}>{inner}</div>;
  return (
    <Link href={card.href} style={style}>
      {inner}
    </Link>
  );
}
