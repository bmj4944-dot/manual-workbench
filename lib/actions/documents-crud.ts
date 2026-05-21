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
  const { supabase, role } = await requireProfile();
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
