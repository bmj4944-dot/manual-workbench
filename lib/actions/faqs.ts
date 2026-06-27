"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import {
  actionFail as fail,
  type ActionResult,
  requirePermission,
  requireProfile,
} from "./_helpers";
import { logAction } from "./_audit";

/**
 * FAQ 관리 server action. 콘텐츠라 approve 권한자(admin·reviewer)에게 연다.
 * service_role(admin client)로 쓰고, 검증 실패는 ActionResult, DB 장애만 throw,
 * 모든 변경은 audit_logs 에 기록. 출처(faq_sources)는 전체 교체.
 */

export type SaveFaqInput = {
  id?: string | null; // 없으면 신규
  question: string;
  answer: string;
  confidence: number; // 0..1
  tags: string[];
  askedCount: number;
  sortOrder: number;
  sources: { documentId: string | null; confidence: number; snippet: string }[];
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

export async function saveFaqAction(
  input: SaveFaqInput,
): Promise<ActionResult<{ id: string }>> {
  const { profileId, role } = await requireProfile();
  requirePermission(role, "approve");

  const question = input.question.trim();
  const answer = input.answer.trim();
  if (!question) return fail("질문을 입력하세요.");
  if (!answer) return fail("답변을 입력하세요.");

  const admin = createAdminClient();
  const tags = input.tags.map((t) => t.trim()).filter(Boolean);
  const payload = {
    question,
    answer,
    confidence: clamp01(input.confidence),
    tags,
    asked_count: Math.max(0, Math.floor(input.askedCount) || 0),
    sort_order: Math.floor(input.sortOrder) || 0,
  };

  let id = input.id?.trim() || "";
  if (id) {
    const { error } = await admin.from("faqs").update(payload).eq("id", id);
    if (error) throw error;
  } else {
    const { data, error } = await admin
      .from("faqs")
      .insert({ ...payload, created_by: profileId })
      .select("id")
      .single();
    if (error) throw error;
    id = (data as { id: string }).id;
  }

  // 출처 전체 교체 — 빈 행(문서·스니펫 모두 없음)은 버린다.
  const sources = input.sources.filter(
    (s) => s.documentId || s.snippet.trim(),
  );
  const { error: delErr } = await admin
    .from("faq_sources")
    .delete()
    .eq("faq_id", id);
  if (delErr) throw delErr;
  if (sources.length) {
    const { error: insErr } = await admin.from("faq_sources").insert(
      sources.map((s, i) => ({
        faq_id: id,
        document_id: s.documentId || null,
        confidence: clamp01(s.confidence),
        snippet: s.snippet.trim() || null,
        sort_order: i,
      })),
    );
    if (insErr) throw insErr;
  }

  await logAction({
    actorId: profileId,
    action: "faq.save",
    targetType: "faq",
    targetId: id,
    metadata: { question, isNew: !input.id },
  });

  revalidatePath("/manage/faq");
  revalidatePath("/");
  return { ok: true, data: { id } };
}

export async function deleteFaqAction(id: string): Promise<ActionResult> {
  const { profileId, role } = await requireProfile();
  requirePermission(role, "approve");

  if (!id) return fail("FAQ를 선택하세요.");

  const admin = createAdminClient();
  // FK: faq_sources 는 on delete cascade
  const { error } = await admin.from("faqs").delete().eq("id", id);
  if (error) throw error;

  await logAction({
    actorId: profileId,
    action: "faq.delete",
    targetType: "faq",
    targetId: id,
  });

  revalidatePath("/manage/faq");
  revalidatePath("/");
  return { ok: true };
}
