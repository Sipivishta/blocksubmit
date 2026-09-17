'use client';

// Admin control for linking/unlinking a teacher-student pair. Search both
// lists client-side (real data passed in as props, fetched server-side by
// the page), submit to the existing admin relationships API. Server-side
// authorization (ADMIN role + RLS) is authoritative — this component only
// renders what the admin page already decided to show.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const filteredTeachers = teachers.filter((t) => t.full_name.toLowerCase().includes(teacherQuery.toLowerCase()));
  const linkedStudentIds = new Set(links.filter((l) => l.teacher_id === selectedTeacher).map((l) => l.student_id));
  const filteredStudents = students.filter((s) => s.full_name.toLowerCase().includes(studentQuery.toLowerCase()));

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
        setError(typeof data.error === 'string' ? data.error : 'Could not link student');
        return;
      }
      router.refresh();
    } catch {
      setError('Network error — please try again');
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
        setError(typeof data.error === 'string' ? data.error : 'Could not unlink');
        return;
      }
      router.refresh();
    } catch {
      setError('Network error — please try again');
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="card-padded">
        <p className="label">1. Select a teacher</p>
        <input
          value={teacherQuery}
          onChange={(e) => setTeacherQuery(e.target.value)}
          placeholder="Search teachers…"
          className="input mt-1.5"
        />
        <div className="mt-3 max-h-72 space-y-1 overflow-y-auto">
          {filteredTeachers.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTeacher(t.id)}
              className={`block w-full rounded-md px-3 py-2 text-left text-sm ${
                selectedTeacher === t.id ? 'bg-brand-50 font-medium text-brand-700' : 'text-ink-700 hover:bg-ink-50'
              }`}
            >
              {t.full_name}
              <span className="ml-2 text-xs text-ink-400">
                {links.filter((l) => l.teacher_id === t.id).length} linked students
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="card-padded">
        <p className="label">2. Link / unlink students</p>
        {!selectedTeacher ? (
          <p className="mt-2 text-sm text-ink-400">Select a teacher on the left first.</p>
        ) : (
          <>
            <input
              value={studentQuery}
              onChange={(e) => setStudentQuery(e.target.value)}
              placeholder="Search students…"
              className="input mt-1.5"
            />
            <div className="mt-3 max-h-72 space-y-1 overflow-y-auto">
              {filteredStudents.map((s) => {
                const linked = linkedStudentIds.has(s.id);
                const linkRow = links.find((l) => l.teacher_id === selectedTeacher && l.student_id === s.id);
                return (
                  <div key={s.id} className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-ink-50">
                    <span className="text-sm text-ink-700">{s.full_name}</span>
                    {linked ? (
                      <button
                        onClick={() => linkRow && handleUnlink(linkRow.id)}
                        disabled={pending !== null}
                        className="text-xs font-medium text-red-600 hover:underline disabled:opacity-40"
                      >
                        {pending === linkRow?.id ? 'Unlinking…' : 'Unlink'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleLink(s.id)}
                        disabled={pending !== null}
                        className="text-xs font-medium text-brand-700 hover:underline disabled:opacity-40"
                      >
                        {pending === s.id ? 'Linking…' : 'Link'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
}
