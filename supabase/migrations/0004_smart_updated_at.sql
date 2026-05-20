-- Make the updated_at trigger respect explicit values.
--
-- Before: on every UPDATE the trigger sets updated_at = now(), clobbering any
-- caller-supplied value. That defeats demo seeds and any historical-data
-- migration that wants to preserve past timestamps.
--
-- After: the trigger only sets updated_at = now() when the caller did NOT
-- change it themselves (new.updated_at == old.updated_at). Explicit values pass
-- through untouched.

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  if new.updated_at is distinct from old.updated_at then
    return new;
  end if;
  new.updated_at := now();
  return new;
end $$;
