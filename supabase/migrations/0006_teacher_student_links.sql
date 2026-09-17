-- Feature 1: admin-managed, many-to-many teacher <-> student relationships.
--
-- Model unchanged for everything already working: a submission's
-- responsible teacher is still derived via
-- submissions.assignment_id -> assignments.teacher_id, exactly as before.
-- This table adds a SEPARATE, admin-controlled concept on top: which
-- teachers a given student is allowed to see/submit to at all. It gates
-- ASSIGNMENT VISIBILITY and NEW SUBMISSION ELIGIBILITY for students —
-- it does not touch submissions/grades RLS, which already correctly
-- scope existing records by direct ownership (student_id = auth.uid(),
-- or assignment.teacher_id = auth.uid()) and are left untouched here, so
-- a student never loses access to work they've already submitted, and a
-- teacher never loses access to submissions against their own
-- assignments, regardless of link state. Unlinking is therefore always
-- non-destructive to history: it only affects future assignment
-- visibility and future submission eligibility, per the requirement that
-- historical records must remain intact.
create table teacher_student_links (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references profiles(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (teacher_id, student_id)
);

create index idx_tsl_teacher on teacher_student_links(teacher_id);
create index idx_tsl_student on teacher_student_links(student_id);

alter table teacher_student_links enable row level security;

-- Only admins may create/modify/delete links — teachers and students have
-- no write policy here at all, so a direct REST call from either role is
-- rejected by RLS regardless of what the application UI shows.
create policy "tsl: admin full access" on teacher_student_links
  for all
  using (current_user_role() = 'ADMIN')
  with check (current_user_role() = 'ADMIN');

-- Teachers may read their own link list (to see which students they're
-- associated with); students may read their own (to see which teachers
-- they're associated with). Neither can read anyone else's links.
create policy "tsl: teacher reads own links" on teacher_student_links
  for select using (teacher_id = auth.uid());

create policy "tsl: student reads own links" on teacher_student_links
  for select using (student_id = auth.uid());

-- Tighten assignment visibility: teachers and admins are unchanged (both
-- already could and still can see every assignment — that wasn't part of
-- this request). Students now only see an assignment if they're linked
-- to that assignment's teacher.
drop policy "assignments: everyone authenticated can read" on assignments;

create policy "assignments: read access" on assignments
  for select using (
    current_user_role() in ('TEACHER', 'ADMIN')
    or exists (
      select 1 from teacher_student_links l
      where l.teacher_id = assignments.teacher_id and l.student_id = auth.uid()
    )
  );

-- Defense in depth at the database layer, mirroring the application-level
-- check added to app/api/submissions/route.ts: a student's own direct
-- INSERT into submissions must also satisfy the same link requirement,
-- not just role/ownership (see 0003_tighten_write_policies.sql for the
-- prior tightening this extends).
drop policy "submissions: student inserts own" on submissions;

create policy "submissions: student inserts own" on submissions
  for insert with check (
    student_id = auth.uid()
    and current_user_role() = 'STUDENT'
    and status = 'UPLOADING'
    and file_hash is null
    and blockchain_tx_hash is null
    and blockchain_block_number is null
    and submitted_at is null
    and exists (
      select 1 from assignments a
      join teacher_student_links l on l.teacher_id = a.teacher_id
      where a.id = submissions.assignment_id and l.student_id = auth.uid()
    )
  );
