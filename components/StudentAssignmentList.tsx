'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Filter, Calendar, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { SubmissionUploadForm } from './SubmissionUploadForm';
import { EmptyState } from './EmptyState';
import type { Assignment, Submission } from '@/types';

interface StudentAssignmentListProps {
  assignments: Assignment[];
  submissions: Submission[];
}

export function StudentAssignmentList({ assignments, submissions }: StudentAssignmentListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'submitted' | 'confirmed' | 'overdue'>('all');

  const submissionByAssignment = new Map<string, Submission>();
  for (const s of submissions) submissionByAssignment.set(s.assignment_id, s);

  const filtered = assignments.filter((assignment) => {
    const submission = submissionByAssignment.get(assignment.id);
    const overdue = new Date(assignment.deadline).getTime() < Date.now();

    const matchesSearch =
      assignment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (assignment.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

    if (!matchesSearch) return false;

    if (statusFilter === 'pending') return !submission && !overdue;
    if (statusFilter === 'submitted') return !!submission;
    if (statusFilter === 'confirmed') return submission?.status === 'CONFIRMED';
    if (statusFilter === 'overdue') return overdue && !submission;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-ink-200/80 shadow-card">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-ink-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search assignments..."
            className="input pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <Filter className="h-4 w-4 text-ink-400 shrink-0 ml-1" />
          {(['all', 'pending', 'submitted', 'confirmed', 'overdue'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider capitalize transition-all shrink-0 ${
                statusFilter === filter
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-ink-100 text-ink-600 hover:bg-ink-200/80'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Assignments List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <EmptyState
            icon="search"
            title="No assignments found"
            description={
              searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search query or status filter.'
                : "Your teachers haven't posted any assignments yet. Check back soon."
            }
          />
        ) : (
          filtered.map((assignment) => {
            const submission = submissionByAssignment.get(assignment.id);
            const overdue = new Date(assignment.deadline).getTime() < Date.now();

            return (
              <div
                key={assignment.id}
                className="card-padded bg-white hover:border-brand-200 transition-all shadow-card space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-100 pb-3">
                  <div className="space-y-1 min-w-0">
                    <h3 className="text-base font-bold text-ink-950 hover:text-brand-600 transition-colors">
                      <Link href={`/assignments/${assignment.id}`}>{assignment.title}</Link>
                    </h3>
                    {assignment.description && (
                      <p className="text-xs text-ink-600 leading-relaxed max-w-2xl">{assignment.description}</p>
                    )}
                    <div className="flex items-center gap-2 pt-1">
                      <Calendar className="h-3.5 w-3.5 text-ink-400" />
                      <span className={`text-xs font-medium ${overdue && !submission ? 'text-red-600 font-bold' : 'text-ink-500'}`}>
                        Due: {new Date(assignment.deadline).toLocaleString()}
                        {overdue && !submission ? ' (Past Due)' : ''}
                      </span>
                    </div>
                  </div>
                  {submission && <StatusBadge status={submission.status} />}
                </div>

                <div>
                  {submission ? (
                    <div className="flex items-center justify-between bg-brand-50/50 p-3 rounded-xl border border-brand-100">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span className="text-xs font-semibold text-ink-800">Submission Recorded</span>
                      </div>
                      <Link
                        href={`/submissions/${submission.id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700 hover:underline"
                      >
                        <span>View Proof & Verification</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  ) : (
                    <SubmissionUploadForm assignmentId={assignment.id} />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
