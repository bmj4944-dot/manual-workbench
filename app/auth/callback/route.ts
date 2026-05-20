import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Magic link / OAuth가 돌아오는 콜백.
// ?code=...  → exchangeCodeForSession 으로 세션 쿠키 세팅 후 / 로 리다이렉트.
// ?error=... → /login?error=... 로 돌려보냄.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error_description") ?? url.searchParams.get("error");
  const next = url.searchParams.get("next") ?? "/";

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error)}`, url.origin),
    );
  }

  if (code) {
    const supabase = createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent(exchangeError.message)}`,
          url.origin,
        ),
      );
    }
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
