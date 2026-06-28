import { fetchEmbedsForManage } from "@/lib/data/embeds";
import { EmbedsClient } from "./embeds-client";

export const dynamic = "force-dynamic";

export default async function ManageEmbedsPage() {
  const { tickets, products } = await fetchEmbedsForManage();
  return <EmbedsClient tickets={tickets} products={products} />;
}
