import "server-only";
import { createClient } from "@/lib/supabase/server";
import { relativeKo } from "./relative-time";
import type { PageStats, Verification, WhatsNewItem } from "@/lib/types";

type PageStatsRow = {
  document_id: string;
  views: number;
  copies: number;
  searches: number;
  helpful: number;
  unhelpful: number;
  hourly: number[] | null;
};

type VerificationRow = {
  document_id: string;
  last_verified_at: string;
  interval_days: number;
  verifier: { name: string } | null;
};

type WhatsNewRow = {
  id: string;
  document_id: string;
  what: string;
  occurred_at: string;
  author: { name: string } | null;
};

type MustReadRow = { document_id: string };
type ComplianceRow = { user_id: string; document_id: string };

export async function fetchPageStats(): Promise<Record<string, PageStats>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("page_stats")
    .select(
      "document_id, views, copies, searches, helpful, unhelpful, hourly",
    );
  if (error) throw error;
  const out: Record<string, PageStats> = {};
  for (const r of (data ?? []) as unknown as PageStatsRow[]) {
    out[r.document_id] = {
      views: r.views,
      copies: r.copies,
      searches: r.searches,
      helpful: Number(r.helpful),
      unhelpful: Number(r.unhelpful),
      ...(r.hourly ? { hourly: r.hourly } : {}),
    };
  }
  return out;
}

export async function fetchVerifications(): Promise<Record<string, Verification>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("verifications")
    .select(
      "document_id, last_verified_at, interval_days, verifier:profiles!verified_by(name)",
    );
  if (error) throw error;
  const out: Record<string, Verification> = {};
  for (const r of (data ?? []) as unknown as VerificationRow[]) {
    const lastVerifiedDays = Math.max(
      0,
      Math.floor((Date.now() - new Date(r.last_verified_at).getTime()) / 86_400_000),
    );
    out[r.document_id] = {
      lastVerified: lastVerifiedDays,
      intervalDays: r.interval_days,
      by: r.verifier?.name ?? "—",
    };
  }
  return out;
}

export async function fetchMustReadIds(): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("must_read_documents")
    .select("document_id");
  if (error) throw error;
  return ((data ?? []) as unknown as MustReadRow[]).map((r) => r.document_id);
}

export async function fetchWhatsNew(): Promise<WhatsNewItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("whats_new")
    .select(
      "id, document_id, what, occurred_at, author:profiles!author_id(name)",
    )
    .order("occurred_at", { ascending: false });
  if (error) throw error;
  const newThreshold = Date.now() - 2 * 86_400_000; // < 2 days = isNew
  return ((data ?? []) as unknown as WhatsNewRow[]).map((r) => {
    const occurred = new Date(r.occurred_at).getTime();
    return {
      id: r.document_id,
      what: r.what,
      when: relativeKo(new Date(r.occurred_at)),
      who: r.author?.name ?? "—",
      isNew: occurred >= newThreshold,
    };
  });
}

export async function fetchComplianceRecords(): Promise<
  Record<string, ReadonlySet<string>>
> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("compliance_records")
    .select("user_id, document_id");
  if (error) throw error;
  const out: Record<string, Set<string>> = {};
  for (const r of (data ?? []) as unknown as ComplianceRow[]) {
    if (!out[r.user_id]) out[r.user_id] = new Set();
    out[r.user_id].add(r.document_id);
  }
  return out;
}
