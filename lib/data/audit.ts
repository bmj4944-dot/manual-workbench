import "server-only";
import { createAdminClient } from "@/lib/supabase/server";

export type AuditLogRow = {
  id: string;
  actorId: string | null;
  actorName: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown>;
  ok: boolean;
  createdAt: string;
};

type RawRow = {
  id: string;
  actor_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  ok: boolean;
  created_at: string;
};

type ProfileRow = { id: string; name: string };

export async function fetchAuditLogs(limit = 200): Promise<AuditLogRow[]> {
  const admin = createAdminClient();

  const res = await admin
    .from("audit_logs")
    .select(
      "id, actor_id, action, target_type, target_id, metadata, ok, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (res.error) throw res.error;
  const rows = (res.data ?? []) as unknown as RawRow[];

  // actor 이름 합치기
  const actorIds = Array.from(
    new Set(rows.map((r) => r.actor_id).filter((x): x is string => !!x)),
  );
  const nameById = new Map<string, string>();
  if (actorIds.length > 0) {
    const profRes = await admin
      .from("profiles")
      .select("id, name")
      .in("id", actorIds);
    if (profRes.error) throw profRes.error;
    for (const p of (profRes.data ?? []) as unknown as ProfileRow[]) {
      nameById.set(p.id, p.name);
    }
  }

  return rows.map<AuditLogRow>((r) => ({
    id: r.id,
    actorId: r.actor_id,
    actorName: r.actor_id ? nameById.get(r.actor_id) ?? null : null,
    action: r.action,
    targetType: r.target_type,
    targetId: r.target_id,
    metadata: r.metadata ?? {},
    ok: r.ok,
    createdAt: r.created_at,
  }));
}
