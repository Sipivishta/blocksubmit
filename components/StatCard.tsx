import React from 'react';
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Users, 
  UserCheck, 
  GitFork, 
  Award 
} from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number;
  subtext?: string;
}

export function StatCard({ label, value, subtext }: StatCardProps) {
  const l = label.toLowerCase();
  
  let icon = FileText;
  let theme = {
    bg: 'bg-brand-50/70',
    border: 'border-brand-100',
    text: 'text-brand-600',
    badge: 'bg-brand-100 text-brand-700'
  };

  if (l.includes('confirmed') || l.includes('on-chain')) {
    icon = ShieldCheck;
    theme = {
      bg: 'bg-emerald-50/70',
      border: 'border-emerald-100',
      text: 'text-emerald-600',
      badge: 'bg-emerald-100 text-emerald-800'
    };
  } else if (l.includes('graded')) {
    icon = Award;
    theme = {
      bg: 'bg-purple-50/70',
      border: 'border-purple-100',
      text: 'text-purple-600',
      badge: 'bg-purple-100 text-purple-800'
    };
  } else if (l.includes('pending') || l.includes('review')) {
    icon = Clock;
    theme = {
      bg: 'bg-amber-50/70',
      border: 'border-amber-100',
      text: 'text-amber-600',
      badge: 'bg-amber-100 text-amber-800'
    };
  } else if (l.includes('teacher')) {
    icon = UserCheck;
    theme = {
      bg: 'bg-violet-50/70',
      border: 'border-violet-100',
      text: 'text-violet-600',
      badge: 'bg-violet-100 text-violet-800'
    };
  } else if (l.includes('student')) {
    icon = Users;
    theme = {
      bg: 'bg-emerald-50/70',
      border: 'border-emerald-100',
      text: 'text-emerald-600',
      badge: 'bg-emerald-100 text-emerald-800'
    };
  } else if (l.includes('relationship')) {
    icon = GitFork;
    theme = {
      bg: 'bg-indigo-50/70',
      border: 'border-indigo-100',
      text: 'text-indigo-600',
      badge: 'bg-indigo-100 text-indigo-800'
    };
  } else if (l.includes('submitted') || l.includes('total')) {
    icon = CheckCircle2;
  }

  const IconComponent = icon;

  return (
    <div className={`card relative overflow-hidden p-4 sm:p-5 border ${theme.border} bg-white transition-all hover:shadow-card hover:-translate-y-0.5`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">{label}</p>
        <div className={`p-2 rounded-xl ${theme.bg} ${theme.text}`}>
          <IconComponent className="h-4 w-4 shrink-0" />
        </div>
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-2">
        <p className="text-2xl sm:text-3xl font-bold tabular-nums tracking-tight text-ink-900">{value}</p>
        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${theme.badge}`}>
          Active
        </span>
      </div>
      {subtext && <p className="mt-1 text-xs text-ink-400">{subtext}</p>}
    </div>
  );
}
