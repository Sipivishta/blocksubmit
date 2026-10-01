'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Filter, ArrowRight, User, FileText, Calendar } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { EmptyState } from './EmptyState';
import type { Profile, Submission } from '@/types';

interface SubmissionsTableProps {
  submissions: Submission[];
  studentById: Record<string, Pick<Profile, 'id' | 'full_name' | 'student_number'>>;
}

export function SubmissionsTable({ submissions, studentById }: SubmissionsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'pending' | 'failed'>('all');

  const filtered = submissions.filter((sub) => {
    const student = studentById[sub.student_id];
    const studentName = student?.full_name ?? '';
    const studentNum = student?.student_number ?? '';

    const matchesSearch =
      studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      studentNum.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.file_name.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'confirmed') return sub.status === 'CONFIRMED';
    if (statusFilter === 'pending') return !['CONFIRMED', 'UPLOAD_FAILED', 'HASH_FAILED', 'BLOCKCHAIN_FAILED'].includes(sub.status);
    if (statusFilter === 'failed') return ['UPLOAD_FAILED', 'HASH_FAILED', 'BLOCKCHAIN_FAILED'].includes(sub.status);
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-ink-200/80 shadow-card">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-ink-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by student name, number, or filename..."
            className="input pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <Filter className="h-4 w-4 text-ink-400 shrink-0 ml-1" />
          {(['all', 'confirmed', 'pending', 'failed'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider capitalize transition-all shrink-0 ${
                statusFilter === filter
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'bg-ink-100 text-ink-600 hover:bg-ink-200/80'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon="search"
          title="No submissions match your filter"
          description="Try clearing your search query or status filter."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-ink-200/80 bg-white shadow-card">
          <table className="w-full min-w-[640px] text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-ink-200/80 bg-ink-50/80 text-[11px] font-bold uppercase tracking-wider text-ink-400">
                <th className="px-5 py-3.5">Student</th>
                <th className="px-5 py-3.5">Submitted File</th>
                <th className="px-5 py-3.5">Submitted At</th>
                <th className="px-5 py-3.5">Verification Status</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {filtered.map((sub) => {
                const student = studentById[sub.student_id];
                return (
                  <tr key={sub.id} className="hover:bg-brand-50/20 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                          {student?.full_name?.[0]?.toUpperCase() ?? 'S'}
                        </div>
                        <div>
                          <p className="font-semibold text-ink-900 leading-tight">
                            {student?.full_name ?? 'Unknown Student'}
                          </p>
                          {student?.student_number && (
                            <p className="text-xs text-ink-400 mt-0.5">ID: {student.student_number}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-ink-400 shrink-0" />
                        <span className="font-mono text-xs text-ink-800 font-medium truncate max-w-[200px]" title={sub.file_name}>
                          {sub.file_name}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-xs text-ink-500">
                      {sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : '—'}
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge status={sub.status} />
                    </td>

                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/submissions/${sub.id}`}
                        className="btn-secondary py-1.5 px-3 text-xs gap-1 font-semibold hover:border-brand-300"
                      >
                        <span>Review Work</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
