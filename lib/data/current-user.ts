import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Role, TeamMember } from "@/lib/types";

type ProfileRow = {
  id: string;
  name: string;
  initials: string;
  color: string;
  role: Role;
};

export type CurrentUser = TeamMember & { email: string };

export async function fetchCurrentUser(): Promise<CurrentUser | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, initials, color, role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!profile) {
    // Profile not yet created (trigger race or trigger off). Fall back to auth info.
    return {
      id: user.id,
      name: user.email ?? "신규 사용자",
      initials: (user.email ?? "?").substring(0, 1).toUpperCase(),
      color: "oklch(0.55 0.14 200)",
      role: "editor",
      email: user.email ?? "",
    };
  }

  const row = profile as unknown as ProfileRow;
  return {
    id: row.id,
    name: row.name,
    initials: row.initials,
    color: row.color,
    role: row.role,
    email: user.email ?? "",
  };
}
