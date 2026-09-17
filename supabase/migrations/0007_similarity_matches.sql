-- Feature 3 (foundational layer only — see chat for scoped delivery
-- plan): storage for pairwise submission similarity results, and RLS
-- that keeps this data restricted to the teacher who owns the
-- assignment (and admins) — students get no read access at all, so a
-- student can never see another student's identity as a "plagiarism"
-- result, per the privacy requirement.
--
-- This is entirely independent of the SHA-256 + blockchain integrity
-- system: that answers "has this exact file changed since it was
-- recorded," this answers "does this submission resemble another
-- submission for the same assignment." Neither replaces the other.
create table submission_similarity_matches (
  id uuid primary key default gen_random_uuid(),
  -- Denormalized alongside the two submissions specifically so RLS can
  -- check "is this the caller's assignment" with one indexed equality
  -- comparison, instead of joining through both submissions on every
  -- row-security check.
  assignment_id uuid not null references assignments(id) on delete cascade,
  submission_id_a uuid not null references submissions(id) on delete cascade,
  submission_id_b uuid not null references submissions(id) on delete cascade,
  similarity_score numeric(5, 2) not null check (similarity_score >= 0 and similarity_score <= 100),
  -- Short matching phrases the algorithm found, for a teacher to see WHY
  -- a pair was flagged — never raw full-document text, and never
  -- anything about a submission's owner beyond what the teacher can
  -- already see via the normal submission/assignment RLS.
  evidence jsonb not null default '[]'::jsonb,
  algorithm_version text not null,
  status text not null default 'COMPLETED' check (status in ('COMPLETED', 'FAILED')),
  error_message text,
  created_at timestamptz not null default now(),
  -- A pair is stored once, in a canonical order, rather than as two
  -- symmetric rows — enforced structurally, not just by convention.
  constraint submission_pair_ordered check (submission_id_a < submission_id_b),
  unique (submission_id_a, submission_id_b)
);

create index idx_ssm_assignment on submission_similarity_matches(assignment_id);
create index idx_ssm_submission_a on submission_similarity_matches(submission_id_a);
create index idx_ssm_submission_b on submission_similarity_matches(submission_id_b);

alter table submission_similarity_matches enable row level security;

-- No INSERT/UPDATE/DELETE policy for any authenticated role: rows are
-- written exclusively by server code using the service-role client
-- (the same pattern the submission state machine already uses for its
-- own status transitions — see app/api/submissions/route.ts), never
-- directly by a student or teacher session, and never through RLS at
-- all. Only SELECT policies exist here.
create policy "similarity: teacher reads own assignment matches" on submission_similarity_matches
  for select using (
    exists (
      select 1 from assignments a
      where a.id = submission_similarity_matches.assignment_id and a.teacher_id = auth.uid()
    )
  );

create policy "similarity: admin reads all" on submission_similarity_matches
  for select using (current_user_role() = 'ADMIN');

-- Deliberately no student policy at all: students have zero read access
-- to this table under any circumstance.
