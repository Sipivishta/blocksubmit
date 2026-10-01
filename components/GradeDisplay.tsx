import type { Grade } from '@/types';
import { Award, Clock } from 'lucide-react';

export function GradeDisplay({ grade }: { grade: Grade | null }) {
  if (!grade) {
    return (
      <div className="card-padded bg-white/80 border border-dashed border-ink-200 text-center py-6">
        <Award className="mx-auto h-8 w-8 text-ink-300 stroke-[1.5]" />
        <p className="mt-2 text-sm font-medium text-ink-600">Pending Evaluation</p>
        <p className="text-xs text-ink-400 mt-0.5">Your teacher has not issued a grade for this submission yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/90 via-emerald-50/50 to-white p-5 sm:p-6 shadow-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
            <Award className="h-5 w-5" />
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Official Evaluation</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-emerald-700">
          <Clock className="h-3.5 w-3.5" />
          <span>{new Date(grade.graded_at).toLocaleDateString()}</span>
        </div>
      </div>

      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-4xl font-extrabold tracking-tight tabular-nums text-emerald-950">{grade.marks}</span>
        <span className="text-lg font-semibold text-emerald-700">/ 100</span>
      </div>

      {grade.feedback && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-white/90 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-500">Teacher Feedback</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-800 whitespace-pre-wrap">{grade.feedback}</p>
        </div>
      )}
    </div>
  );
}
