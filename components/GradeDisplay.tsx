// Read-only grade view for the submitting student. There is no edit
// affordance here at all — not hidden with CSS, just never rendered —
// since the backend (POST /api/grades) only accepts requests from the
// assignment's teacher regardless of what the UI shows.
import type { Grade } from '@/types';

export function GradeDisplay({ grade }: { grade: Grade | null }) {
  if (!grade) {
    return (
      <div className="card-padded">
        <p className="text-sm text-ink-400">Not graded yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-5 sm:p-6">
      <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Grade</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums text-emerald-900">{grade.marks}<span className="text-base font-normal text-emerald-600"> / 100</span></p>
      {grade.feedback && (
        <div className="mt-3">
          <p className="text-xs font-medium text-emerald-800">Feedback</p>
          <p className="mt-1 text-sm text-emerald-900">{grade.feedback}</p>
        </div>
      )}
      <p className="mt-3 text-xs text-emerald-600">Graded {new Date(grade.graded_at).toLocaleString()}</p>
    </div>
  );
}
