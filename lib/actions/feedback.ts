"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "./_helpers";
import { rateLimitThrow } from "./_rate-limit";

/**
 * 문서 피드백 한 표 기록 또는 갱신. 같은 (document_id, user_id) 조합이면
 * 최신 의견으로 덮어쓴다. note 는 선택값.
 */
export async function submitFeedbackAction(
  documentId: string,
  vote: "up" | "down",
  note?: string | null,
) {
  const { supabase, profileId } = await requireProfile();

  // 피드백 스팸 방지 (그룹 5-B).
  await rateLimitThrow(profileId, "feedback.submit", 30, 60_000);

  const trimmed = (note ?? "").trim();
  const { error } = await supabase
    .from("document_feedback")
    .upsert(
      {
        document_id: documentId,
        user_id: profileId,
        vote,
        note: trimmed.length > 0 ? trimmed.slice(0, 500) : null,
      },
      { onConflict: "document_id,user_id" },
    );
  if (error) throw error;
  revalidatePath("/");
}
