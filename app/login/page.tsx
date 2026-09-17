// Login page — uses Supabase Auth's signInWithPassword() directly; no
// custom authentication. On success, fetches the profile's role fresh
// (never trusted from anything cached client-side) and redirects to the
// matching dashboard.
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';
import { dashboardPathForRole } from '@/lib/redirect-for-role';
import { friendlyAuthError } from '@/lib/auth-errors';
import { PasswordInput } from '@/components/PasswordInput';
import { PublicHeader } from '@/components/PublicHeader';
import type { Profile } from '@/types';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const supabase = createBrowserSupabaseClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError || !data.user) {
      setError(friendlyAuthError(signInError?.message));
      setSubmitting(false);
      return;
    }

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();

    router.push(dashboardPathForRole((profile as Profile | null)?.role ?? 'STUDENT'));
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-ink-50">
      <PublicHeader minimal />
      <main className="auth-page px-4 py-12 sm:py-20">
        <div className="relative mx-auto max-w-sm">
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 shadow-lift">
            <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5 text-white">
              <path d="M10 2 3 5.5v5c0 4 3 7 7 8 4-1 7-4 7-8v-5L10 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
              <path d="M7 10.2 9.2 12.4 13.5 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-ink-900">Welcome back</h1>
          <p className="mt-2 text-sm text-ink-500">Access your academic integrity workspace.</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-surface mt-8 space-y-4">
          <div>
            <label className="label" htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              placeholder="you@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="input mt-1"
            />
          </div>
          <div>
            <label className="label" htmlFor="login-password">Password</label>
            <div className="mt-1">
              <PasswordInput id="login-password" value={password} onChange={setPassword} autoComplete="current-password" />
            </div>
          </div>

          {error && <p role="alert" aria-live="polite" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-ink-400">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-medium text-ink-900 underline">
            Register
          </Link>
        </p>
        <Link href="/" className="mt-5 block text-center text-xs font-medium text-ink-400 transition-colors hover:text-brand-600">
          ← Back to home
        </Link>
        </div>
      </main>
    </div>
  );
}
