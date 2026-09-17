-- Tightens two INSERT/UPDATE RLS policies whose WITH CHECK clauses were
-- narrower than intended: they verified *who* was writing, but not enough
-- about *what* was being written. Read/delete behavior is unchanged in
-- both cases — only the write-validation clause is tightened. Written as
-- a new migration rather than editing 0001/0002, which have already been
-- applied to the live database.

-- ---------------------------------------------------------------------
-- FIX 1 (HIGH): submissions INSERT policy.
--
-- Previously only checked student_id = auth.uid() and role = STUDENT.
-- That let a student's own session — via a direct Supabase REST call,
-- bypassing app/api/submissions/route.ts entirely — insert a row with an
-- arbitrary status (e.g. 'CONFIRMED') and fabricated file_hash /
-- blockchain_tx_hash / blockchain_block_number, without ever going
-- through upload, hashing, or on-chain recording. The app itself always
-- inserts with status='UPLOADING' and every hash/blockchain field null
-- (see app/api/submissions/route.ts Step 1) — this policy now requires
-- exactly that shape, so only a genuinely fresh, unrecorded submission
-- can be created this way. Every later transition (STORED, HASHED,
-- RECORDING, CONFIRMED, and the hash/tx fields themselves) still happens
-- only through the service-role client in the app's own state machine,
-- which RLS does not gate at all — this policy only concerns the
-- student's own direct-insert path.
drop policy if exists "submissions: student inserts own" on submissions;

create policy "submissions: student inserts own" on submissions
  for insert with check (
    student_id = auth.uid()
    and current_user_role() = 'STUDENT'
    and status = 'UPLOADING'
    and file_hash is null
    and blockchain_tx_hash is null
    and blockchain_block_number is null
    and submitted_at is null
  );

-- ---------------------------------------------------------------------
-- FIX 2 (LOW): grades teacher write policy.
--
-- The existing FOR ALL policy's USING clause checks that the acting user
-- (auth.uid()) is the assignment's teacher — correct for read/delete, but
-- since no separate WITH CHECK was specified, Postgres also used that
-- same USING expression to validate INSERT/UPDATE. That expression never
-- actually constrained the *value* of the teacher_id column being
-- written, only that the actor owns the assignment. A teacher who owns
-- the assignment could therefore write an arbitrary teacher_id (e.g.
-- another teacher's UUID) via a direct REST call — misattributing who
-- graded it, though never granting access outside assignments they
-- already own. The app itself never sends a client-supplied teacher_id
-- (app/api/grades/route.ts always sets it to the authenticated teacher's
-- own id), so this only closes a direct-API path, and only for writes;
-- USING (governing which rows are visible to read/delete) is unchanged.
drop policy if exists "grades: teacher reads/writes for their assignments" on grades;

create policy "grades: teacher reads/writes for their assignments" on grades
  for all
  using (
    exists (
      select 1 from submissions s
      join assignments a on a.id = s.assignment_id
      where s.id = grades.submission_id and a.teacher_id = auth.uid()
    )
  )
  with check (
    teacher_id = auth.uid()
    and exists (
      select 1 from submissions s
      join assignments a on a.id = s.assignment_id
      where s.id = grades.submission_id and a.teacher_id = auth.uid()
    )
  );
