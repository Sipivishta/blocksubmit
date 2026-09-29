'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Calendar, FileText, ArrowRight, ShieldCheck, Plus } from 'lucide-react';
import { AssignmentForm } from './AssignmentForm';
import { EmptyState } from './EmptyState';
import type { Assignment } from '@/types';

interface TeacherAssignmentListProps {
  assignments: Assignment[];
  countByAssignment: Record<string, number>;
  confirmedByAssignment: Record<string, number>;
}

export function TeacherAssignmentList({
  assignments,
  countByAssignment,
  confirmedByAssignment
}: TeacherAssignmentListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = assignments.filter((a) =>
    a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  return (
    <div className="space-y-6">
      {/* Header controls bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-ink-200/80 shadow-card">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-ink-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your assignments by title..."
            className="input pl-9 text-xs"
          />
        </div>
        <AssignmentForm />
      </div>

      {/* List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <EmptyState
            icon="search"
            title="No assignments found"
            description={
              searchQuery
                ? 'No assignments match your search filter.'
                : 'Create your first assignment to start collecting student submissions.'
            }
          />
        ) : (
          filtered.map((assignment) => {
            const totalCount = countByAssignment[assignment.id] ?? 0;
            const confirmedCount = confirmedByAssignment[assignment.id] ?? 0;
            const overdue = new Date(assignment.deadline).getTime() < Date.now();

            return (
              <div
                key={assignment.id}
                className="card-padded bg-white hover:border-brand-200 transition-all shadow-card space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0 flex-1">
                    <h3 className="text-base font-bold text-ink-950 hover:text-brand-600 transition-colors">
                      <Link href={`/teacher/assignments/${assignment.id}`}>{assignment.title}</Link>
                    </h3>
                    {assignment.description && (
                      <p className="text-xs text-ink-600 leading-relaxed line-clamp-2 max-w-2xl">
                        {assignment.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 pt-1">
                      <Calendar className="h-3.5 w-3.5 text-ink-400" />
                      <span className={`text-xs font-medium ${overdue ? 'text-amber-700 font-semibold' : 'text-ink-500'}`}>
                        Deadline: {new Date(assignment.deadline).toLocaleString()}
                        {overdue ? ' (Closed)' : ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-ink-50 p-2.5 rounded-xl border border-ink-100 shrink-0">
                    <div className="text-center px-2">
                      <p className="text-base font-bold tabular-nums text-ink-900">{totalCount}</p>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">Submissions</p>
                    </div>
                    <div className="h-6 w-px bg-ink-200" />
                    <div className="text-center px-2">
                      <p className="text-base font-bold tabular-nums text-emerald-700">{confirmedCount}</p>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">On-Chain</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-ink-100 pt-3">
                  <div className="flex items-center gap-1.5 text-xs text-ink-500">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Cryptographic verification active</span>
                  </div>
                  <Link
                    href={`/teacher/assignments/${assignment.id}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700 hover:underline"
                  >
                    <span>Manage Submissions ({totalCount})</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
