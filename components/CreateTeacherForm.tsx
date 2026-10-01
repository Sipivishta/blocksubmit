'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Copy, Check, Loader2 } from 'lucide-react';
import { Modal } from './Modal';
import { useToast } from './ToastProvider';

export function CreateTeacherForm() {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLink, setActionLink] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const toast = useToast();

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
        const msg = typeof data.error === 'string' ? data.error : 'Could not create the account';
        setError(msg);
        toast.error('Account creation failed', msg);
        return;
      }
      setActionLink(data.actionLink);
      toast.success('Teacher Account Created', `Account setup for ${fullName}`);
      setEmail('');
      setFullName('');
      router.refresh();
    } catch {
      const msg = 'Network error — please try again';
      setError(msg);
      toast.error('Network error', msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function copyActionLink() {
    if (!actionLink) return;
    try {
      await navigator.clipboard.writeText(actionLink);
      setCopiedLink(true);
      toast.success('Invite link copied to clipboard');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-primary py-2 px-4 shadow-sm active:scale-[0.98] transition-all"
      >
        <UserPlus className="h-4 w-4 stroke-[2]" />
        <span>Add Teacher</span>
      </button>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Add Teacher Account"
        description="Provision a new instructor profile with assignment ownership and grading capabilities."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label mb-1">Full Name</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Dr. Evelyn Carter"
              className="input"
              required
            />
          </div>
          <div>
            <label className="label mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.carter@university.edu"
              className="input"
              required
            />
          </div>

          {error && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {error}
            </div>
          )}

          {actionLink && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-900">Invite Link Generated</p>
                <button
                  type="button"
                  onClick={copyActionLink}
                  className="btn-secondary py-1 px-2.5 text-xs gap-1 bg-white hover:bg-emerald-100/50"
                >
                  {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-ink-600" />}
                  <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
                </button>
              </div>
              <p className="break-all font-mono text-xs text-emerald-800 bg-white p-2.5 rounded-lg border border-emerald-200">
                {actionLink}
              </p>
              <p className="text-[11px] text-emerald-700">
                Provide this link to the instructor for account initialization.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-ink-100">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="btn-secondary text-xs"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary text-xs"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Provisioning Account...</span>
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
