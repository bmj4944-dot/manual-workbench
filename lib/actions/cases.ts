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
 * 사례(case study) 관리 server action. 콘텐츠라 approve 권한자(admin·reviewer)
 * 에게 연다. teams.ts 와 동일하게 service_role(admin client)로 쓰고, 검증 실패는
 * ActionResult, DB 장애만 throw, 모든 변경은 audit_logs 에 기록한다.
 */

const RESULTS = ["good", "bad", "mixed"] as const;
type CaseResult = (typeof RESULTS)[number];

export type SaveCaseInput = {
  id?: string | null; // 없으면 신규
  title: string;
  summary: string;
  result: CaseResult;
  occurredAt: string; // YYYY-MM-DD
  durationText?: string;
  channel?: string;
  agentId?: string | null;
  linkedDocumentId?: string | null;
  transcript: { speaker: string; text: string }[];
  lessons: string[];
};

function newCaseId(occurredAt: string): string {
  const year = /^\d{4}/.exec(occurredAt)?.[0] ?? String(new Date().getFullYear());
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `C-${year}-${rand}`;
}

export async function saveCaseAction(
  input: SaveCaseInput,
): Promise<ActionResult<{ id: string }>> {
  const { profileId, role } = await requireProfile();
  requirePermission(role, "approve");

  const title = input.title.trim();
  const summary = input.summary.trim();
  if (!title) return fail("제목을 입력하세요.");
  if (!summary) return fail("요약을 입력하세요.");
  if (!RESULTS.includes(input.result)) return fail("결과 유형이 올바르지 않습니다.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.occurredAt)) {
    return fail("발생일을 선택하세요.");
  }

  const id = input.id?.trim() || newCaseId(input.occurredAt);
  const admin = createAdminClient();

  const { error: upErr } = await admin.from("cases").upsert(
    {
      id,
      title,
      summary,
      result: input.result,
      occurred_at: input.occurredAt,
      duration_text: input.durationText?.trim() || null,
      channel: input.channel?.trim() || null,
      agent_id: input.agentId || null,
      linked_document_id: input.linkedDocumentId || null,
    },
    { onConflict: "id" },
  );
  if (upErr) throw upErr;

  // 자식(대화록·교훈)은 전체 교체 — 빈 행은 버린다.
  const lines = input.transcript
    .map((l) => ({ speaker: l.speaker.trim(), text: l.text.trim() }))
    .filter((l) => l.speaker || l.text);
  const lessons = input.lessons.map((l) => l.trim()).filter(Boolean);

  const { error: delT } = await admin
    .from("case_transcript_lines")
    .delete()
    .eq("case_id", id);
  if (delT) throw delT;
  if (lines.length) {
    const { error: insT } = await admin.from("case_transcript_lines").insert(
      lines.map((l, i) => ({
        case_id: id,
        speaker: l.speaker,
        text: l.text,
        sort_order: i,
      })),
    );
    if (insT) throw insT;
  }

  const { error: delL } = await admin
    .from("case_lessons")
    .delete()
    .eq("case_id", id);
  if (delL) throw delL;
  if (lessons.length) {
    const { error: insL } = await admin.from("case_lessons").insert(
      lessons.map((lesson, i) => ({ case_id: id, lesson, sort_order: i })),
    );
    if (insL) throw insL;
  }

  await logAction({
    actorId: profileId,
    action: "case.save",
    targetType: "case",
    targetId: id,
    metadata: { title, isNew: !input.id },
  });

  revalidatePath("/manage/cases");
  revalidatePath("/");
  return { ok: true, data: { id } };
}

export async function deleteCaseAction(id: string): Promise<ActionResult> {
  const { profileId, role } = await requireProfile();
  requirePermission(role, "approve");

  if (!id) return fail("사례를 선택하세요.");

  const admin = createAdminClient();
  // FK: transcript / lessons 는 on delete cascade
  const { error } = await admin.from("cases").delete().eq("id", id);
  if (error) throw error;

  await logAction({
    actorId: profileId,
    action: "case.delete",
    targetType: "case",
    targetId: id,
  });

  revalidatePath("/manage/cases");
  revalidatePath("/");
  return { ok: true };
}
