'use client';

// Admin-facing "create teacher account" form, posting to the new
// POST /api/admin/teachers route. That route uses Supabase's Admin API
// (service-role, server-only) to create the auth user and returns an
// invite link — this form surfaces that link so the admin can send it
// manually if the project's outbound email isn't configured yet.
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function CreateTeacherForm() {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLink, setActionLink] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setActionLink(null);

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, fullName })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Could not create the account');
        return;
      }
      setActionLink(data.actionLink);
      setEmail('');
      setFullName('');
      router.refresh();
    } catch {
      setError('Network error — please try again');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary">
        + Add teacher
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card-padded space-y-3">
      <h2 className="text-sm font-semibold text-ink-900">Add a teacher account</h2>
      <div>
        <label className="label">Full name</label>
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="input mt-1" />
      </div>
      <div>
        <label className="label">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input mt-1"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {actionLink && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs">
          <p className="font-medium text-emerald-800">Account created — invite link:</p>
          <p className="mt-1 break-all font-mono text-emerald-700">{actionLink}</p>
          <p className="mt-1 text-emerald-600">
            Send this to the teacher if your project doesn&apos;t have outbound email configured.
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? 'Creating…' : 'Create account'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-secondary">
          Close
        </button>
      </div>
    </form>
  );
}
