-- Changes the grading scale from 0–1000 to 0–100.
--
-- 0001_init.sql's inline `check (marks >= 0)` on grades.marks had no
-- upper bound at all (a gap noted in prior QA — a direct API call could
-- previously insert marks=1500 and the database would accept it; only
-- the application's zod schema enforced any ceiling, and that ceiling
-- was 1000). This migration both narrows the scale to 0–100 and, in the
-- same change, finally gives marks a real database-level upper bound to
-- match — the constraint name (grades_marks_check) was confirmed by
-- querying pg_constraint against the actual 0001_init.sql schema before
-- writing this, rather than assumed.
alter table grades drop constraint grades_marks_check;

alter table grades add constraint grades_marks_check
  check (marks >= 0 and marks <= 100);
