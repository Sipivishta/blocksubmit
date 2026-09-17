// Small stat tile used on the student/teacher/admin dashboard headers.
export function StatCard({ label, value }: { label: string; value: number }) {
  const tone = label.toLowerCase().includes('confirmed') || label.toLowerCase().includes('graded')
    ? 'bg-emerald-50 text-emerald-700'
    : label.toLowerCase().includes('pending')
      ? 'bg-amber-50 text-amber-700'
      : 'bg-brand-50 text-brand-700';
  return (
    <div className="card-padded relative overflow-hidden">
      <div className={`absolute right-4 top-4 h-2 w-2 rounded-full ${tone.split(' ')[0]}`} />
      <p className="text-[11px] font-bold uppercase tracking-wide text-ink-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-ink-900">{value}</p>
      <div className={`mt-3 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tone}`}>Live</div>
    </div>
  );
}
