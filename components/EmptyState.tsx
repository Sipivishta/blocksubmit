import React from 'react';
import { Inbox, FileQuestion, SearchX } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: 'inbox' | 'search' | 'file';
}

export function EmptyState({ title, description, action, icon = 'inbox' }: EmptyStateProps) {
  const IconComponent = icon === 'search' ? SearchX : icon === 'file' ? FileQuestion : Inbox;

  return (
    <div className="surface-grid card relative flex flex-col items-center justify-center p-8 sm:p-12 text-center border-dashed border-2 border-ink-200 bg-white/70">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 shadow-sm border border-brand-100">
        <IconComponent className="h-6 w-6 stroke-[1.5]" />
      </div>
      <h3 className="text-base font-semibold text-ink-900 tracking-tight">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-ink-500 leading-relaxed">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
