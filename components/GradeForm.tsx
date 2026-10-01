'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Award, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from './ToastProvider';
import type { Grade } from '@/types';

export function GradeForm({ submissionId, existingGrade }: { submissionId: string; existingGrade: Grade | null }) {
  const [marks, setMarks] = useState(existingGrade ? String(existingGrade.marks) : '');
  const [feedback, setFeedback] = useState(existingGrade?.feedback ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const toast = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const marksNum = Number(marks);
    if (marks === '' || Number.isNaN(marksNum) || marksNum < 0 || marksNum > 100) {
      const msg = 'Marks must be a number between 0 and 100';
      setError(msg);
      toast.error('Invalid mark input', msg);
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
        const msg = typeof data.error === 'string' ? data.error : 'Could not save grade';
        setError(msg);
        toast.error('Grading failed', msg);
        return;
      }
      setSuccess(true);
      toast.success('Grade recorded successfully', `Marks: ${marksNum}/100`);
      router.refresh();
    } catch {
      const msg = 'Network error — please try again';
      setError(msg);
      toast.error('Network error', msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card-padded bg-white space-y-4 shadow-card">
      <div className="flex items-center gap-2 border-b border-ink-100 pb-3">
        <Award className="h-5 w-5 text-brand-600" />
        <h3 className="text-sm font-semibold text-ink-900">
          {existingGrade ? 'Update Grade & Feedback' : 'Grade Submission'}
        </h3>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-1">
          <label className="label mb-1" htmlFor="marks-input">Marks (0 – 100)</label>
          <div className="relative flex items-center">
            <input
              id="marks-input"
              type="number"
              min={0}
              max={100}
              step="0.5"
              placeholder="e.g. 92.5"
              value={marks}
              onChange={(e) => setMarks(e.target.value)}
              className="input text-base font-bold pr-12"
            />
            <span className="absolute right-3 text-xs font-semibold text-ink-400">/ 100</span>
          </div>
        </div>

        <div className="sm:col-span-2">
          <label className="label mb-1">Feedback Notes</label>
          <textarea
            placeholder="Write constructive feedback for the student..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            maxLength={5000}
            rows={2}
            className="input text-sm"
          />
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>Grade saved successfully and updated in student record.</span>
        </div>
      )}

      <div className="flex justify-end">
        <button type="submit" disabled={submitting} className="btn-primary py-2 px-5 text-xs">
          {submitting ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
              <span>Saving Grade...</span>
            </>
          ) : existingGrade ? (
            'Update Grade'
          ) : (
            'Submit Grade'
          )}
        </button>
      </div>
    </form>
  );
}
