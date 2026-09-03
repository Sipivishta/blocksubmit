'use client';

// Teacher-facing "create assignment" form, posting to the existing
// POST /api/assignments route. Client-side checks are for usability only —
// the server re-validates everything (see app/api/assignments/route.ts).
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function AssignmentForm() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
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
        setError(typeof data.error === 'string' ? data.error : 'Could not create assignment');
        return;
      }
      setTitle('');
      setDescription('');
      setDeadline('');
      setOpen(false);
      router.refresh();
    } catch {
      setError('Network error — please try again');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="btn-primary"
      >
        + New assignment
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 card-padded">
      <h2 className="font-medium text-ink-900">New assignment</h2>
      <div>
        <label className="label">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          className="input mt-1"
          placeholder="Assignment title"
        />
      </div>
      <div>
        <label className="label">Description (optional)</label>
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
          {submitting ? 'Creating…' : 'Create assignment'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="btn-secondary"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
