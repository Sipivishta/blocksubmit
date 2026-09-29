'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Edit3, Loader2 } from 'lucide-react';
import { Modal } from './Modal';
import { useToast } from './ToastProvider';
import type { Assignment } from '@/types';

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export function EditAssignmentForm({ assignment }: { assignment: Assignment }) {
  const [title, setTitle] = useState(assignment.title);
  const [description, setDescription] = useState(assignment.description ?? '');
  const [deadline, setDeadline] = useState(toLocalInputValue(assignment.deadline));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
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

    setSubmitting(true);
    try {
      const res = await fetch(`/api/assignments/${assignment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description: description || null, deadline: deadlineIso })
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = typeof data.error === 'string' ? data.error : 'Could not update assignment';
        setError(msg);
        toast.error('Update failed', msg);
        return;
      }
      toast.success('Assignment updated', `Changes to "${title}" saved.`);
      setEditing(false);
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
        onClick={() => setEditing(true)}
        className="btn-secondary text-xs gap-1.5 active:scale-[0.98] transition-all"
      >
        <Edit3 className="h-3.5 w-3.5 text-ink-600" />
        <span>Edit Details</span>
      </button>

      <Modal
        isOpen={editing}
        onClose={() => setEditing(false)}
        title="Edit Assignment"
        description="Update assignment details or deadline."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label mb-1">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              className="input"
            />
          </div>
          <div>
            <label className="label mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={5000}
              rows={3}
              className="input text-sm"
            />
          </div>
          <div>
            <label className="label mb-1">Deadline</label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="input"
            />
          </div>

          {error && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3 border-t border-ink-100 pt-4">
            <button
              type="button"
              onClick={() => setEditing(false)}
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
                  <span>Saving...</span>
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
