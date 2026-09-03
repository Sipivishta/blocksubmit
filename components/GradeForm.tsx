'use client';

// Teacher-facing grading form, posting to the existing POST /api/grades
// route (upsert). Client-side range check is for usability; the server is
// the final authority (zod schema in app/api/grades/route.ts) and also
// re-checks that the caller actually owns the assignment.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Grade } from '@/types';

export function GradeForm({ submissionId, existingGrade }: { submissionId: string; existingGrade: Grade | null }) {
  const [marks, setMarks] = useState(existingGrade ? String(existingGrade.marks) : '');
  const [feedback, setFeedback] = useState(existingGrade?.feedback ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const marksNum = Number(marks);
    if (marks === '' || Number.isNaN(marksNum) || marksNum < 0 || marksNum > 100) {
      setError('Marks must be a number between 0 and 100');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/grades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId, marks: marksNum, feedback: feedback || undefined })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Could not save grade');
        return;
      }
      setSuccess(true);
      router.refresh();
    } catch {
      setError('Network error — please try again');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card-padded space-y-3">
      <h2 className="text-sm font-semibold text-ink-900">{existingGrade ? 'Update grade' : 'Grade this submission'}</h2>
      <div>
        <label className="label">Marks (0–100)</label>
        <input
          type="number"
          min={0}
          max={100}
          step="0.5"
          value={marks}
          onChange={(e) => setMarks(e.target.value)}
          className="input mt-1 w-32"
        />
      </div>
      <div>
        <label className="label">Feedback (optional)</label>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          maxLength={5000}
          rows={3}
          className="input mt-1"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && (
        <p className="flex items-center gap-1.5 text-sm text-emerald-600">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-[10px]">✓</span>
          Grade saved.
        </p>
      )}

      <button type="submit" disabled={submitting} className="btn-primary">
        {submitting ? 'Saving…' : existingGrade ? 'Update grade' : 'Submit grade'}
      </button>
    </form>
  );
}
