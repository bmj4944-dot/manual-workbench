import { fetchAuditLogs } from "@/lib/data/audit";
import { AuditClient } from "./audit-client";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  const logs = await fetchAuditLogs(200);
  return <AuditClient logs={logs} />;
}
