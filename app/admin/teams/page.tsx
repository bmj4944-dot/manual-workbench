import { fetchTeamsWithMembers } from "@/lib/data/teams";
import { fetchAllUsers } from "@/lib/data/users";
import { TeamsClient } from "./teams-client";

export const dynamic = "force-dynamic";

export default async function AdminTeamsPage() {
  const [teams, users] = await Promise.all([
    fetchTeamsWithMembers(),
    fetchAllUsers(),
  ]);

  return (
    <TeamsClient
      teams={teams}
      users={users.map((u) => ({
        profileId: u.profileId,
        name: u.name,
        initials: u.initials,
        color: u.color,
        role: u.role,
      }))}
    />
  );
}
