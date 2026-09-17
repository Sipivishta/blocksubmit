'use client';

// Teacher-facing "edit assignment" form, posting to the existing
// PATCH /api/assignments/[id] route added alongside this component.
// Client-side checks are for usability only — the server re-validates
// everything and re-checks ownership (see app/api/assignments/[id]/route.ts).
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Assignment } from '@/types';

function toLocalInputValue(iso: string): string {
  // <input type="datetime-local"> needs "YYYY-MM-DDTHH:mm" in local time,
  // not the ISO string's UTC representation.
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
        setError(typeof data.error === 'string' ? data.error : 'Could not update assignment');
        return;
      }
      setEditing(false);
      router.refresh();
    } catch {
      setError('Network error — please try again');
    } finally {
      setSubmitting(false);
    }
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="rounded-lg border border-ink-200 px-4 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50"
      >
        Edit assignment
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 card-padded">
      <h2 className="font-medium text-ink-900">Edit assignment</h2>
      <div>
        <label className="label">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          className="input mt-1"
        />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={5000}
          rows={3}
          className="input mt-1"
        />
      </div>
      <div>
        <label className="label">Deadline</label>
        <input
          type="datetime-local"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className="input mt-1"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary"
        >
          {submitting ? 'Saving…' : 'Save changes'}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="btn-secondary"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
