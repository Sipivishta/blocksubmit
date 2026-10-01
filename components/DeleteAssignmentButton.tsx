'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { Modal } from './Modal';
import { useToast } from './ToastProvider';

export function DeleteAssignmentButton({ assignmentId }: { assignmentId: string }) {
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const toast = useToast();

  async function handleDelete() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/assignments/${assignmentId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        const msg = typeof data.error === 'string' ? data.error : 'Could not delete assignment';
        setError(msg);
        toast.error('Deletion restricted', msg);
        return;
      }
      toast.success('Assignment deleted');
      setConfirmOpen(false);
      router.push('/teacher');
      router.refresh();
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
        onClick={() => setConfirmOpen(true)}
        className="btn-danger text-xs gap-1.5 active:scale-[0.98] transition-all"
      >
        <Trash2 className="h-3.5 w-3.5" />
        <span>Delete Assignment</span>
      </button>

      <Modal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Delete Assignment"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/80 p-4">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs text-red-900 leading-relaxed">
              Are you sure you want to delete this assignment? If students have submitted work to this assignment, deletion will be blocked by system integrity constraints.
            </div>
          </div>

          {error && (
            <div role="alert" className="rounded-lg border border-red-300 bg-red-100/80 p-3 text-xs text-red-900 font-medium">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="btn-danger text-xs px-4"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                'Confirm Delete'
              )}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
