import { fetchCasesForManage } from "@/lib/data/cases";
import { fetchAllUsers } from "@/lib/data/users";
import { fetchDocumentTree } from "@/lib/data/documents";
import { CasesClient } from "./cases-client";

export const dynamic = "force-dynamic";

export default async function ManageCasesPage() {
  const [cases, users, tree] = await Promise.all([
    fetchCasesForManage(),
    fetchAllUsers(),
    fetchDocumentTree(),
  ]);

  return (
    <CasesClient
      cases={cases}
      agents={users.map((u) => ({ id: u.profileId, name: u.name }))}
      tree={tree}
    />
  );
}
