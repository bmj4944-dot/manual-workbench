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

export async function fetchTeamMembers(): Promise<TeamMember[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, initials, color, role")
    .order("name");
  if (error) throw error;
  return ((data ?? []) as unknown as ProfileRow[]).map((p) => ({
    id: p.id,
    name: p.name,
    initials: p.initials,
    color: p.color,
    role: p.role,
  }));
}
