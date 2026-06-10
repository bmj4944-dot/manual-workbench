import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  DocSensitivity,
  DocVisibility,
  NodeStatus,
  TreeNode,
} from "@/lib/types";

type DocumentRow = {
  id: string;
  parent_id: string | null;
  label: string;
  label_en: string | null;
  type: "chapter" | "section" | "item";
  status: NodeStatus | null;
  sort_order: number;
  badge: string | null;
  is_open: boolean;
  required_approver_id: string | null;
  review_deadline: string | null;
  sensitivity: DocSensitivity | null;
  visibility: DocVisibility | null;
  owner_team_id: string | null;
};

export async function fetchDocumentTree(): Promise<TreeNode[]> {
  const supabase = createClient();

  const [docsResult, commentsResult] = await Promise.all([
    supabase
      .from("documents")
      .select(
        "id, parent_id, label, label_en, type, status, sort_order, badge, is_open, required_approver_id, review_deadline, sensitivity, visibility, owner_team_id",
      )
      .order("sort_order"),
    supabase.from("comments").select("document_id"),
  ]);

  if (docsResult.error) throw docsResult.error;

  const rows = (docsResult.data ?? []) as unknown as DocumentRow[];

  const commentCount = new Map<string, number>();
  for (const row of (commentsResult.data ?? []) as Array<{ document_id: string }>) {
    commentCount.set(row.document_id, (commentCount.get(row.document_id) ?? 0) + 1);
  }

  const map = new Map<string, TreeNode>();
  for (const r of rows) {
    map.set(r.id, {
      id: r.id,
      label: r.label,
      labelEn: r.label_en ?? undefined,
      type: r.type,
      status: r.status ?? undefined,
      open: r.is_open || undefined,
      badge: r.badge === "PDF" ? "PDF" : undefined,
      hasComments: commentCount.get(r.id) || undefined,
      requiredApproverId: r.required_approver_id,
      reviewDeadline: r.review_deadline,
      sensitivity: r.sensitivity ?? "general",
      visibility: r.visibility ?? "all",
      ownerTeamId: r.owner_team_id,
      children: r.type === "item" ? undefined : [],
    });
  }

  const roots: TreeNode[] = [];
  for (const r of rows) {
    const node = map.get(r.id)!;
    if (r.parent_id === null) {
      roots.push(node);
      continue;
    }
    const parent = map.get(r.parent_id);
    if (parent?.children) parent.children.push(node);
  }

  return roots;
}
