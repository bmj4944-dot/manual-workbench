"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, requireProfile } from "./_helpers";
import type { NodeStatus, TreeNode } from "@/lib/types";

type DocType = "chapter" | "section" | "item";

// Generate a stable, opaque id (prefix + 8 hex chars).
function newId(): string {
  const hex = "0123456789abcdef";
  let s = "n-";
  for (let i = 0; i < 8; i++)
    s += hex[Math.floor(Math.random() * 16)];
  return s;
}

type CreateInput = {
  parentId: string | null;
  type: DocType;
  label: string;
  labelEn?: string;
  status?: NodeStatus;
};

export async function createDocumentAction(input: CreateInput): Promise<TreeNode> {
  const { supabase, profileId, role } = await requireProfile();
  requirePermission(role, "edit");

  // Compute next sort_order among siblings
  const siblings = await supabase
    .from("documents")
    .select("sort_order")
    .filter("parent_id", input.parentId === null ? "is" : "eq", input.parentId as never)
    .order("sort_order", { ascending: false })
    .limit(1);
  const lastOrder =
    ((siblings.data ?? [])[0] as { sort_order?: number } | undefined)
      ?.sort_order ?? 0;
  const sortOrder = lastOrder + 10;

  const id = newId();
  const { error } = await supabase.from("documents").insert({
    id,
    parent_id: input.parentId,
    label: input.label,
    label_en: input.labelEn ?? null,
    type: input.type,
    status: input.status ?? "draft",
    sort_order: sortOrder,
    is_open: false,
    created_by: profileId,
  });
  if (error) throw error;

  revalidatePath("/");
  return {
    id,
    label: input.label,
    labelEn: input.labelEn,
    type: input.type,
    status: input.status ?? "draft",
    children: input.type === "item" ? undefined : [],
  };
}

export async function renameDocumentAction(id: string, label: string) {
  const { supabase, role } = await requireProfile();
  requirePermission(role, "edit");
  const trimmed = label.trim();
  if (!trimmed) throw new Error("빈 이름은 허용되지 않습니다.");
  const { error } = await supabase
    .from("documents")
    .update({ label: trimmed })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/");
}

export async function deleteDocumentAction(id: string) {
  const { supabase, role } = await requireProfile();
  requirePermission(role, "edit");
  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/");
}

/**
 * Add a sibling — same parent, same type, after the given node.
 */
export async function addSiblingAction(
  refId: string,
  label?: string,
): Promise<TreeNode> {
  const { supabase, profileId, role } = await requireProfile();
  requirePermission(role, "edit");

  const { data: ref, error: refErr } = await supabase
    .from("documents")
    .select("parent_id, type, sort_order")
    .eq("id", refId)
    .maybeSingle();
  if (refErr) throw refErr;
  if (!ref) throw new Error("기준 문서를 찾을 수 없습니다.");

  const r = ref as {
    parent_id: string | null;
    type: DocType;
    sort_order: number;
  };
  const defaultLabel =
    label ??
    (r.type === "chapter" ? "새 장" : r.type === "section" ? "새 절" : "새 항목");
  const id = newId();
  const newSort = r.sort_order + 5; // squeeze between ref and next sibling
  const { error } = await supabase.from("documents").insert({
    id,
    parent_id: r.parent_id,
    label: defaultLabel,
    type: r.type,
    status: "draft",
    sort_order: newSort,
    is_open: false,
    created_by: profileId,
  });
  if (error) throw error;
  revalidatePath("/");
  return {
    id,
    label: defaultLabel,
    type: r.type,
    status: "draft",
    children: r.type === "item" ? undefined : [],
  };
}

/**
 * Duplicate a document and its descendants (and its content body), inserting
 * the new copy right after the original.
 */
export async function duplicateDocumentAction(
  refId: string,
): Promise<TreeNode> {
  const { supabase, profileId, role } = await requireProfile();
  requirePermission(role, "edit");

  // Load all descendants in one go. With 3-level tree this is cheap.
  const { data: all, error: aErr } = await supabase
    .from("documents")
    .select(
      "id, parent_id, label, label_en, type, status, sort_order, badge, is_open",
    );
  if (aErr) throw aErr;
  const rows = (all ?? []) as Array<{
    id: string;
    parent_id: string | null;
    label: string;
    label_en: string | null;
    type: DocType;
    status: NodeStatus | null;
    sort_order: number;
    badge: string | null;
    is_open: boolean;
  }>;

  const byParent = new Map<string | null, typeof rows>();
  for (const r of rows) {
    const arr = byParent.get(r.parent_id) ?? [];
    arr.push(r);
    byParent.set(r.parent_id, arr);
  }
  const find = (id: string) => rows.find((r) => r.id === id);

  const ref = find(refId);
  if (!ref) throw new Error("기준 문서를 찾을 수 없습니다.");

  const toInsert: Array<{
    id: string;
    parent_id: string | null;
    label: string;
    label_en: string | null;
    type: DocType;
    status: NodeStatus;
    sort_order: number;
    badge: string | null;
    is_open: boolean;
    created_by: string;
  }> = [];
  const idMap = new Map<string, string>();

  const dup = (
    src: (typeof rows)[number],
    newParent: string | null,
    newSort: number,
    isRoot: boolean,
  ): TreeNode => {
    const nid = newId();
    idMap.set(src.id, nid);
    toInsert.push({
      id: nid,
      parent_id: newParent,
      label: isRoot ? `${src.label} (복사본)` : src.label,
      label_en: src.label_en,
      type: src.type,
      status: (src.status ?? "draft") as NodeStatus,
      sort_order: newSort,
      badge: src.badge,
      is_open: src.is_open,
      created_by: profileId,
    });
    const kids = (byParent.get(src.id) ?? []).slice().sort(
      (a, b) => a.sort_order - b.sort_order,
    );
    const childNodes: TreeNode[] = [];
    kids.forEach((k, i) => {
      childNodes.push(dup(k, nid, (i + 1) * 10, false));
    });
    return {
      id: nid,
      label: isRoot ? `${src.label} (복사본)` : src.label,
      labelEn: src.label_en ?? undefined,
      type: src.type,
      status: src.status ?? undefined,
      badge: src.badge === "PDF" ? "PDF" : undefined,
      children: src.type === "item" ? undefined : childNodes,
    };
  };

  const rootDup = dup(ref, ref.parent_id, ref.sort_order + 5, true);

  const { error: insErr } = await supabase.from("documents").insert(toInsert);
  if (insErr) throw insErr;

  // Also duplicate document_content for body preservation
  const { data: contents } = await supabase
    .from("document_content")
    .select("document_id, tags, version, body, pdf_title, pdf_pages, pdf_storage_path")
    .in("document_id", Array.from(idMap.keys()));
  if (contents && contents.length > 0) {
    const dupContents = (contents as Array<Record<string, unknown>>).map((c) => ({
      document_id: idMap.get(c.document_id as string)!,
      tags: c.tags,
      version: c.version,
      body: c.body,
      pdf_title: c.pdf_title,
      pdf_pages: c.pdf_pages,
      // pdf_storage_path intentionally NOT duplicated (file would be shared)
    }));
    await supabase.from("document_content").insert(dupContents);
  }

  revalidatePath("/");
  return rootDup;
}

/**
 * Swap sort_order with an adjacent sibling.
 *   dir = -1 → move up (swap with previous sibling)
 *   dir = +1 → move down (swap with next sibling)
 */
export async function moveDocumentAction(id: string, dir: -1 | 1) {
  const { supabase, role } = await requireProfile();
  requirePermission(role, "edit");

  const { data: me, error: meErr } = await supabase
    .from("documents")
    .select("id, parent_id, sort_order")
    .eq("id", id)
    .maybeSingle();
  if (meErr) throw meErr;
  if (!me) throw new Error("문서를 찾을 수 없습니다.");

  const meRow = me as {
    id: string;
    parent_id: string | null;
    sort_order: number;
  };

  // Find sibling on the requested side, closest by sort_order.
  const cmp = dir === -1 ? "lt" : "gt";
  const order = dir === -1 ? false : true;

  const baseQ = supabase
    .from("documents")
    .select("id, sort_order")
    .filter(
      "parent_id",
      meRow.parent_id === null ? "is" : "eq",
      meRow.parent_id as never,
    )
    .filter("sort_order", cmp, meRow.sort_order as never)
    .order("sort_order", { ascending: order })
    .limit(1);

  const { data: sibling } = await baseQ;
  const sib = ((sibling ?? []) as Array<{ id: string; sort_order: number }>)[0];
  if (!sib) return; // already at the end

  // Swap their sort_order. Use a temp value to avoid unique constraint
  // conflicts if one ever existed. (We don't, but defensive.)
  const tempOrder = meRow.sort_order * 1000 + 1;
  await supabase
    .from("documents")
    .update({ sort_order: tempOrder })
    .eq("id", meRow.id);
  await supabase
    .from("documents")
    .update({ sort_order: meRow.sort_order })
    .eq("id", sib.id);
  await supabase
    .from("documents")
    .update({ sort_order: sib.sort_order })
    .eq("id", meRow.id);

  revalidatePath("/");
}
