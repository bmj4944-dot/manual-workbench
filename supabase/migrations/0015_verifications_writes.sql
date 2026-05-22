-- Re-verification workflow (C-5). Lets authenticated users update / insert
-- their own verification record. Role gating (only reviewer/admin can call
-- the Server Action) happens in `lib/actions/verifications.ts` —
-- consistent with our pattern elsewhere (RLS = row-level baseline, Server
-- Action = role-level check).

drop policy if exists "verifications_insert_auth" on verifications;
create policy "verifications_insert_auth" on verifications
  for insert to authenticated
  with check (true);

drop policy if exists "verifications_update_auth" on verifications;
create policy "verifications_update_auth" on verifications
  for update to authenticated
  using (true)
  with check (true);

notify pgrst, 'reload schema';
