// Consistent empty-state block for lists with nothing in them yet.
// Presentational only — the caller decides when there's nothing to show.
export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="card-padded flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-ink-100">
        <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5 text-ink-400">
          <rect x="4" y="4" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      </div>
      <p className="text-sm font-medium text-ink-700">{title}</p>
      {description && <p className="mt-1 max-w-xs text-sm text-ink-400">{description}</p>}
    </div>
  );
}
