import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { AppNotification } from "@/lib/types";

type RawRow = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  doc_id: string | null;
  actor_id: string | null;
  read_at: string | null;
  created_at: string;
};

type ProfileRow = { id: string; name: string };

/**
 * 현재 로그인 사용자의 알림을 최신순으로. RLS(notifications_select_own)가
 * 수신자 본인 행만 돌려주므로 일반 authenticated 클라이언트를 쓴다. 행위자
 * 이름은 audit.ts 와 같은 수동 조인 (profiles 는 authenticated 가 읽을 수 있음).
 */
export async function fetchNotifications(limit = 50): Promise<AppNotification[]> {
  const supabase = createClient();

  const res = await supabase
    .from("notifications")
    .select("id, type, title, body, doc_id, actor_id, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (res.error) throw res.error;
  const rows = (res.data ?? []) as unknown as RawRow[];

  const actorIds = Array.from(
    new Set(rows.map((r) => r.actor_id).filter((x): x is string => !!x)),
  );
  const nameById = new Map<string, string>();
  if (actorIds.length > 0) {
    const profRes = await supabase
      .from("profiles")
      .select("id, name")
      .in("id", actorIds);
    if (!profRes.error) {
      for (const p of (profRes.data ?? []) as unknown as ProfileRow[]) {
        nameById.set(p.id, p.name);
      }
    }
  }

  return rows.map<AppNotification>((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    body: r.body,
    docId: r.doc_id,
    actorName: r.actor_id ? nameById.get(r.actor_id) ?? null : null,
    read: r.read_at !== null,
    createdAt: r.created_at,
  }));
}
