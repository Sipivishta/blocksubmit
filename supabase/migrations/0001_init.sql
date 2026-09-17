-- BlockSubmit initial schema
-- Run via `supabase migration up` or the Supabase SQL editor.

create extension if not exists "pgcrypto";

-- ---------- ENUMS ----------
create type user_role as enum ('STUDENT', 'TEACHER', 'ADMIN');

create type submission_status as enum (
  'UPLOADING',
  'STORED',
  'HASHED',
  'RECORDING',
  'CONFIRMED',
  'UPLOAD_FAILED',
  'HASH_FAILED',
  'BLOCKCHAIN_FAILED'
);

-- ---------- PROFILES ----------
-- One row per auth.users row. Created via trigger on signup (see below).
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role user_role not null default 'STUDENT',
  student_number text,
  department text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_profiles_role on profiles(role);

-- ---------- ASSIGNMENTS ----------
create table assignments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  deadline timestamptz not null,
  created_at timestamptz not null default now()
);

create index idx_assignments_teacher on assignments(teacher_id);
create index idx_assignments_deadline on assignments(deadline);

-- ---------- SUBMISSIONS ----------
create table submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references assignments(id) on delete restrict,
  student_id uuid not null references profiles(id) on delete cascade,

  file_name text not null,
  file_path text not null,          -- R2 object key, e.g. submissions/{id}/{sanitizedName}
  file_size bigint not null check (file_size > 0 and file_size <= 20971520), -- 20MB ceiling, defense-in-depth alongside app-layer check
  mime_type text not null,
  file_hash text,                    -- SHA-256 hex, set once STORED->HASHED

  status submission_status not null default 'UPLOADING',

  blockchain_tx_hash text,
  blockchain_block_number bigint,

  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (assignment_id, student_id)
);

create index idx_submissions_assignment on submissions(assignment_id);
create index idx_submissions_student on submissions(student_id);
create index idx_submissions_status on submissions(status);

-- ---------- GRADES ----------
create table grades (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references submissions(id) on delete cascade,
  teacher_id uuid not null references profiles(id) on delete cascade,
  marks numeric(6, 2) not null check (marks >= 0),
  feedback text,
  graded_at timestamptz not null default now()
);

create index idx_grades_teacher on grades(teacher_id);

-- ---------- AUDIT LOGS ----------
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  action text not null,             -- e.g. 'submission.upload', 'submission.verify', 'file.download'
  resource_type text not null,      -- e.g. 'submission', 'assignment', 'grade'
  resource_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_audit_logs_user on audit_logs(user_id);
create index idx_audit_logs_resource on audit_logs(resource_type, resource_id);
create index idx_audit_logs_created on audit_logs(created_at desc);

-- ---------- updated_at triggers ----------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

create trigger trg_submissions_updated_at
  before update on submissions
  for each row execute function set_updated_at();

-- Block self role-escalation: a student calling the Supabase REST API
-- directly with their own JWT (bypassing our Next.js API routes entirely)
-- must not be able to set role='TEACHER' or 'ADMIN' on their own profile.
-- Role changes are allowed only via our service-role server code
-- (auth.role() = 'service_role') or by an existing ADMIN acting on someone
-- else's profile — never by a user changing their own row.
create or replace function prevent_role_self_escalation()
returns trigger as $$
begin
  if new.role is distinct from old.role
     and auth.role() <> 'service_role'
     and not (current_user_role() = 'ADMIN' and old.id <> auth.uid())
  then
    raise exception 'Only an administrator can change a user''s role';
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_prevent_role_self_escalation
  before update on profiles
  for each row execute function prevent_role_self_escalation();

-- ---------- new-user -> profile trigger ----------
-- Supabase Auth creates rows in auth.users; mirror a profile automatically.
-- role defaults to STUDENT; promote via admin tooling / SQL for TEACHER/ADMIN.
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Unnamed User'),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'STUDENT')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ================= ROW LEVEL SECURITY =================
alter table profiles enable row level security;
alter table assignments enable row level security;
alter table submissions enable row level security;
alter table grades enable row level security;
alter table audit_logs enable row level security;

-- Helper: current user's role, read from profiles (avoids recursive RLS by
-- using a SECURITY DEFINER function instead of a subquery on profiles itself).
create or replace function current_user_role()
returns user_role as $$
  select role from public.profiles where id = auth.uid();
$$ language sql stable security definer;

-- ---- profiles policies ----
create policy "profiles: self read" on profiles
  for select using (id = auth.uid());

create policy "profiles: teachers/admins read all" on profiles
  for select using (current_user_role() in ('TEACHER', 'ADMIN'));

create policy "profiles: self update (non-role fields enforced in app layer)" on profiles
  for update using (id = auth.uid());

create policy "profiles: admin full access" on profiles
  for all using (current_user_role() = 'ADMIN');

-- ---- assignments policies ----
create policy "assignments: everyone authenticated can read" on assignments
  for select using (auth.uid() is not null);

create policy "assignments: teacher creates own" on assignments
  for insert with check (teacher_id = auth.uid() and current_user_role() = 'TEACHER');

create policy "assignments: teacher updates own" on assignments
  for update using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

create policy "assignments: teacher deletes own" on assignments
  for delete using (teacher_id = auth.uid());

create policy "assignments: admin full access" on assignments
  for all using (current_user_role() = 'ADMIN');

-- ---- submissions policies ----
create policy "submissions: student reads own" on submissions
  for select using (student_id = auth.uid());

create policy "submissions: teacher reads submissions to their assignments" on submissions
  for select using (
    exists (
      select 1 from assignments a
      where a.id = submissions.assignment_id and a.teacher_id = auth.uid()
    )
  );

create policy "submissions: student inserts own" on submissions
  for insert with check (student_id = auth.uid() and current_user_role() = 'STUDENT');

-- Deliberately NO student (or teacher) UPDATE policy on submissions.
-- Every status/hash/blockchain-field transition in this app is a
-- server-controlled state-machine step (see app/api/submissions/route.ts,
-- .../[id]/retry/route.ts) performed with the service-role client, which
-- bypasses RLS by design. If we granted students row-level UPDATE access
-- here, they could call the Supabase REST API directly with their own JWT
-- and set status='CONFIRMED' (or forge file_hash / blockchain_tx_hash)
-- without ever going through upload, hashing, or on-chain recording. RLS
-- has no clean way to allow "students can update MY row, but only via
-- our server, and only these columns, and only along legal transitions" —
-- so the correct fix is to not grant direct UPDATE at all and keep every
-- transition behind the server's authorization + state-machine checks.

create policy "submissions: admin full access" on submissions
  for all using (current_user_role() = 'ADMIN');

-- ---- grades policies ----
create policy "grades: student reads own submission's grade" on grades
  for select using (
    exists (
      select 1 from submissions s
      where s.id = grades.submission_id and s.student_id = auth.uid()
    )
  );

create policy "grades: teacher reads/writes for their assignments" on grades
  for all using (
    exists (
      select 1 from submissions s
      join assignments a on a.id = s.assignment_id
      where s.id = grades.submission_id and a.teacher_id = auth.uid()
    )
  );

create policy "grades: admin full access" on grades
  for all using (current_user_role() = 'ADMIN');

-- ---- audit_logs policies ----
-- Written only by server (service role bypasses RLS). Reads: admin only,
-- plus a user can see their own actions.
create policy "audit_logs: self read" on audit_logs
  for select using (user_id = auth.uid());

create policy "audit_logs: admin read all" on audit_logs
  for select using (current_user_role() = 'ADMIN');
