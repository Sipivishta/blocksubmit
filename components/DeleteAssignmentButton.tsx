'use client';

// Teacher-facing delete control, posting to the existing
// DELETE /api/assignments/[id] route. If the assignment has submissions,
// the DB's ON DELETE RESTRICT constraint blocks the delete server-side and
// the route returns 409 — surfaced here as a clear message rather than a
// raw database error.
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function DeleteAssignmentButton({ assignmentId }: { assignmentId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleDelete() {
    if (!window.confirm('Delete this assignment? This cannot be undone.')) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/assignments/${assignmentId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Could not delete assignment');
        return;
      }
      router.push('/teacher');
      router.refresh();
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={handleDelete} disabled={loading} className="btn-danger">
        {loading ? 'Deleting…' : 'Delete assignment'}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
