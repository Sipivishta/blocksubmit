-- Hardens the automatic profile-creation trigger from 0001_init.sql.
--
-- Why a new migration instead of editing 0001: 0001 has already been
-- applied to the live database, so editing it wouldn't change anything
-- there — it would only misrepresent what actually ran. This migration
-- is written to be safe to run on a database that already has the
-- original trigger (or even one that's missing it entirely).
--
-- Changes:
--   1. ON CONFLICT (id) DO NOTHING — if a profiles row already exists for
--      this user (e.g. one created manually, like the test account),
--      the insert is silently skipped instead of raising a duplicate-key
--      error that would abort the auth.users insert itself. This is
--      what "safe against duplicate profile creation" and "do not
--      overwrite an existing profile" mean in practice: existing rows
--      are left completely untouched, not merged or updated.
--   2. `set search_path = public` on the function — a SECURITY DEFINER
--      function with no pinned search_path can, in principle, be tricked
--      into resolving an unqualified identifier against a schema an
--      attacker controls. Explicit `public` (and `public.profiles`
--      already being schema-qualified in the body) closes that off.
--   3. `drop trigger if exists` + recreate — makes re-running this
--      migration idempotent, and guarantees the trigger definition
--      matches this function even if 0001's trigger was, for whatever
--      reason, never successfully created.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Unnamed User'),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'STUDENT')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- No RLS policies are touched by this migration — profiles/assignments/
-- submissions/grades/audit_logs policies from 0001_init.sql are unchanged.
