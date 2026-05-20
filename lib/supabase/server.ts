import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "./types";

// Server Components / Server Actions / Route Handlers 에서 사용.
// Server Components 안에서는 cookies().set()이 호출되어도 무시 가능 (no-op).
export function createClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Component 에서 호출되면 set이 막혀 있음 — middleware가 세션을 새로고침하므로 무시해도 됨.
          }
        },
      },
    }
  );
}

// 관리자 용도 (RLS 우회). 절대 클라이언트로 노출 금지.
export function createAdminClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: { getAll: () => [], setAll: () => {} },
    }
  );
}
