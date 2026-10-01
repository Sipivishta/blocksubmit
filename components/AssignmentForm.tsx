'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Calendar, FileText, Loader2 } from 'lucide-react';
import { Modal } from './Modal';
import { useToast } from './ToastProvider';

export function AssignmentForm() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const toast = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (title.length > 200) {
      setError('Title must be under 200 characters');
      return;
    }
    if (!deadline) {
      setError('Deadline is required');
      return;
    }
    const deadlineIso = new Date(deadline).toISOString();
    if (new Date(deadlineIso).getTime() < Date.now()) {
      setError('Deadline must be in the future');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description: description || undefined, deadline: deadlineIso })
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = typeof data.error === 'string' ? data.error : 'Could not create assignment';
        setError(msg);
        toast.error('Assignment creation failed', msg);
        return;
      }
      toast.success('Assignment created', `"${title}" is now active for submissions.`);
      setTitle('');
      setDescription('');
      setDeadline('');
      setOpen(false);
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
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-primary py-2 px-4 shadow-sm active:scale-[0.98] transition-all"
      >
        <Plus className="h-4 w-4 stroke-[2.5]" />
        <span>New Assignment</span>
      </button>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Create New Assignment"
        description="Post an assignment for enrolled students with automated deadline tracking and tamper-proof verification."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label mb-1">Assignment Title</label>
            <div className="relative flex items-center">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                className="input"
                placeholder="e.g. Midterm Lab Report: Network Cryptography"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="label mb-1">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={5000}
              rows={3}
              className="input text-sm"
              placeholder="Provide submission guidelines, file format requirements, or instructions..."
            />
          </div>

          <div>
            <label className="label mb-1">Submission Deadline</label>
            <div className="relative flex items-center">
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="input"
              />
            </div>
          </div>

          {error && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3 border-t border-ink-100 pt-4">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary text-xs"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Posting Assignment...</span>
                </>
              ) : (
                'Create Assignment'
              )}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
