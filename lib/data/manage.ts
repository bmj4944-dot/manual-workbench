import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * 관리 허브(/manage) 카드의 현황 뱃지용 카운트. 아직 마이그가 안 된 테이블은
 * 에러 → null 로 떨어뜨려(카드에 카운트 미표시) 단계적 도입 중에도 안전하다.
 */
async function countTable(table: string): Promise<number | null> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) return null;
  return count ?? 0;
}

export type ManageCounts = {
  cases: number | null;
  faqs: number | null;
  onboarding: number | null;
  tickets: number | null;
  products: number | null;
};

export async function fetchManageCounts(): Promise<ManageCounts> {
  const [cases, faqs, onboarding, tickets, products] = await Promise.all([
    countTable("cases"),
    countTable("faqs"),
    countTable("onboarding_tasks"),
    countTable("crm_tickets"),
    countTable("products"),
  ]);
  return { cases, faqs, onboarding, tickets, products };
}
