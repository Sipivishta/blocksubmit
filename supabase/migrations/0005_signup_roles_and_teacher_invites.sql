-- Ensure every profile created by the Auth signup trigger starts as a
-- STUDENT. User-controlled Auth metadata must never select a privileged
-- profile role during normal signup.
--
-- Trusted teacher invitations promote the trigger-created profile explicitly
-- in the server-only admin invitation route after Auth creates the user.
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
    'STUDENT'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;