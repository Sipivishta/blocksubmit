import React from 'react';

export function StatSkeleton() {
  return (
    <div className="card-padded animate-pulse">
      <div className="h-3.5 w-20 rounded bg-ink-200" />
      <div className="mt-2.5 h-7 w-12 rounded bg-ink-300" />
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="card-padded animate-pulse space-y-3">
      <div className="flex justify-between items-start">
        <div className="space-y-2 flex-1">
          <div className="h-4 w-1/3 rounded bg-ink-200" />
          <div className="h-3 w-2/3 rounded bg-ink-100" />
        </div>
        <div className="h-6 w-20 rounded-full bg-ink-200" />
      </div>
      <div className="h-3 w-1/4 rounded bg-ink-100" />
    </div>
  );
}

export function TableSkeleton() {
  return (
    <div className="rounded-xl border border-ink-200 bg-white p-4 animate-pulse space-y-4">
      <div className="h-6 w-1/4 rounded bg-ink-200" />
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex justify-between items-center gap-4 py-2 border-b border-ink-100">
            <div className="h-4 w-32 rounded bg-ink-200" />
            <div className="h-4 w-48 rounded bg-ink-100" />
            <div className="h-4 w-24 rounded bg-ink-100" />
            <div className="h-6 w-20 rounded-full bg-ink-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
