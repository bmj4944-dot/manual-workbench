import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Diagnostic endpoint for RLS troubleshooting.
 *
 *   curl http://localhost:3100/api/diag   (from a logged-in browser tab,
 *   or via DevTools console: `await fetch('/api/diag').then(r=>r.json())`)
 *
 * Reports:
 *   - whether the server action sees the user
 *   - the user.id (auth.users.id) the action will use
 *   - the profile linked by auth_user_id (or null)
 *   - the result of public.debug_auth_info() — what RLS actually sees
 */
export async function GET() {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  const profileByAuth = user
    ? await supabase
        .from("profiles")
        .select("id, auth_user_id, name, role")
        .eq("auth_user_id", user.id)
        .maybeSingle()
    : { data: null, error: null };

  // Calling debug_auth_info() — needs 0008 applied. The result tells us
  // what auth.uid() returns INSIDE Postgres for this request.
  const debug = await supabase.rpc("debug_auth_info").maybeSingle();

  return NextResponse.json({
    auth: user
      ? { id: user.id, email: user.email, role: user.role }
      : null,
    authError: authError?.message ?? null,
    profileByAuth: {
      data: profileByAuth.data,
      error: profileByAuth.error?.message ?? null,
    },
    debugAuthInfo: {
      data: debug.data,
      error: debug.error?.message ?? null,
    },
  });
}
