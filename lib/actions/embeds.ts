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
 * 본문 임베드(CRM 티켓 / 상품 카탈로그) 관리 server action. 콘텐츠라
 * approve 권한자(admin·reviewer)에게 연다. service_role(admin client)로 쓰고,
 * 검증 실패는 ActionResult, DB 장애만 throw, 변경은 audit_logs 에 기록.
 *
 * id/sku 는 text PK(사용자 입력). originalId/originalSku 가 없으면 신규(insert),
 * 있으면 update — PK 변경도 허용한다.
 */

const TICKET_STATUSES = ["open", "resolved", "closed"] as const;
type TicketStatus = (typeof TICKET_STATUSES)[number];

const STOCK_STATUSES = ["in", "low"] as const;
type StockStatus = (typeof STOCK_STATUSES)[number];

export type SaveTicketInput = {
  originalId?: string | null;
  id: string;
  title: string;
  customer: string;
  status: TicketStatus;
  statusLabel: string;
  priority: string;
  age: string;
  assignee: string;
  channel: string;
};

export async function saveTicketAction(
  input: SaveTicketInput,
): Promise<ActionResult<{ id: string }>> {
  const { profileId, role } = await requireProfile();
  requirePermission(role, "approve");

  const id = input.id.trim();
  const title = input.title.trim();
  if (!id) return fail("티켓 ID를 입력하세요. (예: T-2026-0089)");
  if (!title) return fail("제목을 입력하세요.");
  if (!TICKET_STATUSES.includes(input.status)) {
    return fail("상태 값이 올바르지 않습니다.");
  }

  const admin = createAdminClient();
  const payload = {
    id,
    title,
    customer: input.customer.trim() || null,
    status: input.status,
    status_label: input.statusLabel.trim() || null,
    priority: input.priority.trim() || null,
    age_text: input.age.trim() || null,
    assignee: input.assignee.trim() || null,
    channel: input.channel.trim() || null,
  };

  const original = input.originalId?.trim() || "";
  if (original) {
    const { error } = await admin
      .from("crm_tickets")
      .update(payload)
      .eq("id", original);
    if (error) {
      if (error.code === "23505") return fail(`티켓 ID "${id}"가 이미 있습니다.`);
      throw error;
    }
  } else {
    const { error } = await admin.from("crm_tickets").insert(payload);
    if (error) {
      if (error.code === "23505") return fail(`티켓 ID "${id}"가 이미 있습니다.`);
      throw error;
    }
  }

  await logAction({
    actorId: profileId,
    action: "embed.ticket.save",
    targetType: "crm_ticket",
    targetId: id,
    metadata: { title, isNew: !original },
  });

  revalidatePath("/manage/embeds");
  revalidatePath("/");
  return { ok: true, data: { id } };
}

export async function deleteTicketAction(id: string): Promise<ActionResult> {
  const { profileId, role } = await requireProfile();
  requirePermission(role, "approve");

  if (!id) return fail("티켓을 선택하세요.");

  const admin = createAdminClient();
  const { error } = await admin.from("crm_tickets").delete().eq("id", id);
  if (error) throw error;

  await logAction({
    actorId: profileId,
    action: "embed.ticket.delete",
    targetType: "crm_ticket",
    targetId: id,
  });

  revalidatePath("/manage/embeds");
  revalidatePath("/");
  return { ok: true };
}

export type SaveProductInput = {
  originalSku?: string | null;
  sku: string;
  name: string;
  price: string;
  stock: number;
  stockStatus: StockStatus;
  category: string;
  rating: string;
};

export async function saveProductAction(
  input: SaveProductInput,
): Promise<ActionResult<{ sku: string }>> {
  const { profileId, role } = await requireProfile();
  requirePermission(role, "approve");

  const sku = input.sku.trim();
  const name = input.name.trim();
  if (!sku) return fail("SKU를 입력하세요. (예: SKU-9821)");
  if (!name) return fail("상품명을 입력하세요.");
  if (!STOCK_STATUSES.includes(input.stockStatus)) {
    return fail("재고 상태 값이 올바르지 않습니다.");
  }

  const admin = createAdminClient();
  const payload = {
    sku,
    name,
    price_text: input.price.trim() || null,
    stock: Math.max(0, Math.floor(input.stock) || 0),
    stock_status: input.stockStatus,
    category: input.category.trim() || null,
    rating_text: input.rating.trim() || null,
  };

  const original = input.originalSku?.trim() || "";
  if (original) {
    const { error } = await admin
      .from("products")
      .update(payload)
      .eq("sku", original);
    if (error) {
      if (error.code === "23505") return fail(`SKU "${sku}"가 이미 있습니다.`);
      throw error;
    }
  } else {
    const { error } = await admin.from("products").insert(payload);
    if (error) {
      if (error.code === "23505") return fail(`SKU "${sku}"가 이미 있습니다.`);
      throw error;
    }
  }

  await logAction({
    actorId: profileId,
    action: "embed.product.save",
    targetType: "product",
    targetId: sku,
    metadata: { name, isNew: !original },
  });

  revalidatePath("/manage/embeds");
  revalidatePath("/");
  return { ok: true, data: { sku } };
}

export async function deleteProductAction(sku: string): Promise<ActionResult> {
  const { profileId, role } = await requireProfile();
  requirePermission(role, "approve");

  if (!sku) return fail("상품을 선택하세요.");

  const admin = createAdminClient();
  const { error } = await admin.from("products").delete().eq("sku", sku);
  if (error) throw error;

  await logAction({
    actorId: profileId,
    action: "embed.product.delete",
    targetType: "product",
    targetId: sku,
  });

  revalidatePath("/manage/embeds");
  revalidatePath("/");
  return { ok: true };
}
