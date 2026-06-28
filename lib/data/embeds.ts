import "server-only";
import { createClient } from "@/lib/supabase/server";
import { EMBED_DATA } from "@/lib/sample-data";
import type { EmbedData } from "@/lib/types";

/**
 * 본문 임베드 운영화 — 하드코딩 EMBED_DATA 를 DB(crm_tickets/products)에서 읽는다.
 * 본문의 .embed[data-embed="ticket-<id>" | "product-<sku>"] 가 이 맵을 참조한다.
 */

type TicketRow = {
  id: string;
  title: string;
  customer: string | null;
  status: "open" | "resolved" | "closed";
  status_label: string | null;
  priority: string | null;
  age_text: string | null;
  assignee: string | null;
  channel: string | null;
};

type ProductRow = {
  sku: string;
  name: string;
  price_text: string | null;
  stock: number;
  stock_status: "in" | "low";
  category: string | null;
  rating_text: string | null;
};

function ticketToEmbed(row: TicketRow): EmbedData {
  return {
    type: "ticket",
    id: row.id,
    title: row.title,
    customer: row.customer ?? "",
    status: row.status,
    statusLabel: row.status_label ?? "",
    priority: row.priority ?? "",
    age: row.age_text ?? "",
    assignee: row.assignee ?? "",
    channel: row.channel ?? "",
  };
}

function productToEmbed(row: ProductRow): EmbedData {
  return {
    type: "product",
    sku: row.sku,
    name: row.name,
    price: row.price_text ?? "",
    stock: row.stock,
    stockStatus: row.stock_status,
    category: row.category ?? "",
    rating: row.rating_text ?? "",
  };
}

/**
 * 읽기(본문 하이드레이션)용. `ticket-<id>` / `product-<sku>` 키 맵.
 * 마이그 0032 적용 전(테이블 없음, 42P01)이면 하드코딩으로 폴백 —
 * 임베드만 영향, 워크벤치 전체 fetch 가 함께 죽지 않게 한다.
 */
export async function fetchEmbeds(): Promise<Record<string, EmbedData>> {
  const supabase = createClient();
  const [tickets, products] = await Promise.all([
    supabase
      .from("crm_tickets")
      .select(
        "id, title, customer, status, status_label, priority, age_text, assignee, channel",
      )
      .order("updated_at", { ascending: false }),
    supabase
      .from("products")
      .select(
        "sku, name, price_text, stock, stock_status, category, rating_text",
      )
      .order("updated_at", { ascending: false }),
  ]);

  const tableMissing = (e: { code?: string } | null) => e?.code === "42P01";
  if (tableMissing(tickets.error) || tableMissing(products.error)) {
    return EMBED_DATA;
  }
  if (tickets.error) throw tickets.error;
  if (products.error) throw products.error;

  const map: Record<string, EmbedData> = {};
  for (const row of (tickets.data ?? []) as TicketRow[]) {
    map[`ticket-${row.id}`] = ticketToEmbed(row);
  }
  for (const row of (products.data ?? []) as ProductRow[]) {
    map[`product-${row.sku}`] = productToEmbed(row);
  }
  return map;
}

// ─────────────────────────────────────────────────────────────
// 관리(/manage/embeds) 전용 — DB 원본 행 형태로.
// ─────────────────────────────────────────────────────────────
export type ManageTicket = {
  id: string;
  title: string;
  customer: string;
  status: "open" | "resolved" | "closed";
  statusLabel: string;
  priority: string;
  age: string;
  assignee: string;
  channel: string;
};

export type ManageProduct = {
  sku: string;
  name: string;
  price: string;
  stock: number;
  stockStatus: "in" | "low";
  category: string;
  rating: string;
};

export async function fetchEmbedsForManage(): Promise<{
  tickets: ManageTicket[];
  products: ManageProduct[];
}> {
  const supabase = createClient();
  const [tickets, products] = await Promise.all([
    supabase
      .from("crm_tickets")
      .select(
        "id, title, customer, status, status_label, priority, age_text, assignee, channel",
      )
      .order("updated_at", { ascending: false }),
    supabase
      .from("products")
      .select(
        "sku, name, price_text, stock, stock_status, category, rating_text",
      )
      .order("updated_at", { ascending: false }),
  ]);
  if (tickets.error) throw tickets.error;
  if (products.error) throw products.error;

  return {
    tickets: ((tickets.data ?? []) as TicketRow[]).map((r) => ({
      id: r.id,
      title: r.title,
      customer: r.customer ?? "",
      status: r.status,
      statusLabel: r.status_label ?? "",
      priority: r.priority ?? "",
      age: r.age_text ?? "",
      assignee: r.assignee ?? "",
      channel: r.channel ?? "",
    })),
    products: ((products.data ?? []) as ProductRow[]).map((r) => ({
      sku: r.sku,
      name: r.name,
      price: r.price_text ?? "",
      stock: r.stock,
      stockStatus: r.stock_status,
      category: r.category ?? "",
      rating: r.rating_text ?? "",
    })),
  };
}
