'use client';

// Admin-only control: promotes an existing student account to teacher,
// via the existing PATCH /api/admin/users/[id]/promote route. Server-side
// authorization (ADMIN role + the target-must-be-STUDENT check) is
// authoritative; this button only appears on rows the admin page already
// filtered to students.
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function PromoteToTeacherButton({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handlePromote() {
    setLoading(true);
    setConfirming(false);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/promote`, { method: 'PATCH' });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Could not promote user');
        return;
      }
      const name = typeof data.profile?.full_name === 'string' ? data.profile.full_name : 'Student';
      router.push(`/admin/students?promoted=${encodeURIComponent(name)}`);
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="text-right">
      <button onClick={() => { setError(null); setConfirming(true); }} disabled={loading} className="btn-secondary py-1 text-xs">
        {loading ? 'Promoting…' : 'Promote to teacher'}
      </button>
      {error && <p role="alert" className="mt-1 text-xs text-red-600">{error}</p>}

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4" role="presentation">
          <div role="dialog" aria-modal="true" aria-labelledby="promote-title" className="card w-full max-w-sm p-5 text-left shadow-popover">
            <h2 id="promote-title" className="text-base font-semibold text-ink-900">Promote this student?</h2>
            <p className="mt-1 text-sm text-ink-500">Their role will change to teacher and they will leave the student directory.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirming(false)} className="btn-secondary">Cancel</button>
              <button type="button" onClick={handlePromote} className="btn-primary">Confirm promotion</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
