'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, UserCheck, Loader2 } from 'lucide-react';
import { Modal } from './Modal';
import { useToast } from './ToastProvider';

export function PromoteToTeacherButton({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const toast = useToast();

  async function handlePromote() {
    setLoading(true);
    setConfirming(false);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/promote`, { method: 'PATCH' });
      const data = await res.json();
      if (!res.ok) {
        const msg = typeof data.error === 'string' ? data.error : 'Could not promote user';
        setError(msg);
        toast.error('Promotion failed', msg);
        return;
      }
      const name = typeof data.profile?.full_name === 'string' ? data.profile.full_name : 'Student';
      toast.success('User Promoted', `${name} is now a Teacher.`);
      router.push(`/admin/students?promoted=${encodeURIComponent(name)}`);
    } catch {
      const msg = 'Network error — please try again';
      setError(msg);
      toast.error('Network error', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => { setError(null); setConfirming(true); }}
        disabled={loading}
        className="btn-secondary py-1 px-3 text-xs gap-1.5 active:scale-[0.98] transition-all"
      >
        <UserCheck className="h-3.5 w-3.5 text-violet-600" />
        <span>{loading ? 'Promoting...' : 'Promote to Teacher'}</span>
      </button>

      {error && <p role="alert" className="mt-1 text-xs text-red-600 font-medium">{error}</p>}

      <Modal
        isOpen={confirming}
        onClose={() => setConfirming(false)}
        title="Promote Student to Teacher?"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-violet-200 bg-violet-50/80 p-4">
            <ShieldAlert className="h-5 w-5 text-violet-700 shrink-0 mt-0.5" />
            <div className="text-xs text-violet-900 leading-relaxed">
              This will update the user&apos;s system role to TEACHER. They will gain assignment creation and grading privileges, and will be moved to the teacher directory.
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              onClick={handlePromote}
              disabled={loading}
              className="btn-primary text-xs bg-violet-700 hover:bg-violet-800 border-none px-4"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Promoting...</span>
                </>
              ) : (
                'Confirm Promotion'
              )}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
