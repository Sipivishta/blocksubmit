'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Link as LinkIcon, Unlink, User, GraduationCap, CheckCircle2 } from 'lucide-react';
import { useToast } from './ToastProvider';
import type { Profile } from '@/types';

interface Link {
  id: string;
  teacher_id: string;
  student_id: string;
}

export function RelationshipManager({
  teachers,
  students,
  links
}: {
  teachers: Pick<Profile, 'id' | 'full_name'>[];
  students: Pick<Profile, 'id' | 'full_name'>[];
  links: Link[];
}) {
  const [teacherQuery, setTeacherQuery] = useState('');
  const [studentQuery, setStudentQuery] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(teachers[0]?.id ?? null);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const toast = useToast();

  const filteredTeachers = teachers.filter((t) => t.full_name.toLowerCase().includes(teacherQuery.toLowerCase()));
  const linkedStudentIds = new Set(links.filter((l) => l.teacher_id === selectedTeacher).map((l) => l.student_id));
  const filteredStudents = students.filter((s) => s.full_name.toLowerCase().includes(studentQuery.toLowerCase()));

  const activeTeacher = teachers.find((t) => t.id === selectedTeacher);

  async function handleLink(studentId: string) {
    if (!selectedTeacher) return;
    setPending(studentId);
    setError(null);
    try {
      const res = await fetch('/api/admin/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId: selectedTeacher, studentId })
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = typeof data.error === 'string' ? data.error : 'Could not link student';
        setError(msg);
        toast.error('Linking failed', msg);
        return;
      }
      toast.success('Relationship linked');
      router.refresh();
    } catch {
      const msg = 'Network error — please try again';
      setError(msg);
      toast.error('Network error', msg);
    } finally {
      setPending(null);
    }
  }

  async function handleUnlink(linkId: string) {
    if (!window.confirm('Unlink this student from this teacher? Existing assignments, submissions, and grades are not affected.')) return;
    setPending(linkId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/relationships/${linkId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        const msg = typeof data.error === 'string' ? data.error : 'Could not unlink';
        setError(msg);
        toast.error('Unlinking failed', msg);
        return;
      }
      toast.success('Relationship unlinked');
      router.refresh();
    } catch {
      const msg = 'Network error — please try again';
      setError(msg);
      toast.error('Network error', msg);
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Teacher selection panel */}
      <div className="card-padded bg-white shadow-card">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-lg bg-violet-100 text-violet-700">
            <User className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-ink-500">1. Select Teacher</p>
            <p className="text-xs text-ink-400">Choose instructor to view and edit student access</p>
          </div>
        </div>

        <div className="relative mt-2">
          <Search className="absolute left-3 top-3 h-4 w-4 text-ink-400" />
          <input
            value={teacherQuery}
            onChange={(e) => setTeacherQuery(e.target.value)}
            placeholder="Search teachers by name..."
            className="input pl-9 text-xs"
          />
        </div>

        <div className="mt-3 max-h-80 space-y-1.5 overflow-y-auto pr-1">
          {filteredTeachers.map((t) => {
            const count = links.filter((l) => l.teacher_id === t.id).length;
            const isSelected = selectedTeacher === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setSelectedTeacher(t.id)}
                className={`flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-left transition-all ${
                  isSelected
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'bg-ink-50/70 text-ink-800 hover:bg-ink-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-violet-100 text-violet-700'
                  }`}>
                    {t.full_name[0]?.toUpperCase()}
                  </span>
                  <span className="truncate text-sm font-semibold">{t.full_name}</span>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-ink-200/80 text-ink-700'
                }`}>
                  {count} enrolled
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Student linking panel */}
      <div className="card-padded bg-white shadow-card">
        <div className="flex items-center justify-between mb-3 border-b border-ink-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
              <GraduationCap className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-ink-500">2. Enrolled Students</p>
              {activeTeacher && <p className="text-xs font-semibold text-ink-800">For {activeTeacher.full_name}</p>}
            </div>
          </div>
        </div>

        {!selectedTeacher ? (
          <p className="mt-4 text-xs text-ink-400">Select a teacher on the left to manage student enrollment links.</p>
        ) : (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-ink-400" />
              <input
                value={studentQuery}
                onChange={(e) => setStudentQuery(e.target.value)}
                placeholder="Search student list..."
                className="input pl-9 text-xs"
              />
            </div>

            <div className="mt-3 max-h-80 space-y-1.5 overflow-y-auto pr-1">
              {filteredStudents.map((s) => {
                const linked = linkedStudentIds.has(s.id);
                const linkRow = links.find((l) => l.teacher_id === selectedTeacher && l.student_id === s.id);
                const isPending = pending === (linkRow?.id ?? s.id);

                return (
                  <div
                    key={s.id}
                    className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 border transition-all ${
                      linked ? 'border-emerald-200 bg-emerald-50/40' : 'border-ink-100 bg-white hover:bg-ink-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                        linked ? 'bg-emerald-100 text-emerald-800' : 'bg-ink-100 text-ink-600'
                      }`}>
                        {s.full_name[0]?.toUpperCase()}
                      </span>
                      <span className="text-xs font-semibold text-ink-900 truncate">{s.full_name}</span>
                    </div>

                    {linked ? (
                      <button
                        onClick={() => linkRow && handleUnlink(linkRow.id)}
                        disabled={pending !== null}
                        className="btn-danger py-1 px-2.5 text-[11px] gap-1"
                      >
                        <Unlink className="h-3 w-3" />
                        <span>{isPending ? 'Unlinking...' : 'Unlink'}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleLink(s.id)}
                        disabled={pending !== null}
                        className="btn-primary py-1 px-2.5 text-[11px] gap-1"
                      >
                        <LinkIcon className="h-3 w-3" />
                        <span>{isPending ? 'Linking...' : 'Link'}</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
        {error && <p className="mt-2 text-xs text-red-600 font-medium">{error}</p>}
      </div>
    </div>
  );
}
