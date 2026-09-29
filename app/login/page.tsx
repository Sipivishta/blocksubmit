'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';
import { dashboardPathForRole } from '@/lib/redirect-for-role';
import { friendlyAuthError } from '@/lib/auth-errors';
import { PasswordInput } from '@/components/PasswordInput';
import { PublicHeader } from '@/components/PublicHeader';
import { Shield, Mail, AlertCircle, Loader2, LogIn, ArrowLeft } from 'lucide-react';
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
    <div className="min-h-screen bg-ink-50 flex flex-col">
      <PublicHeader minimal />
      <main className="auth-page flex-1 flex items-center justify-center px-4 py-12 sm:py-16">
        <div className="relative w-full max-w-md">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 shadow-lift text-white">
              <Shield className="h-7 w-7 stroke-[2]" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-ink-950">Welcome back</h1>
            <p className="mt-1.5 text-sm text-ink-500">Sign in to your academic integrity workspace</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-surface mt-8 space-y-4 bg-white p-6 sm:p-8 rounded-2xl border border-ink-200/80 shadow-popover">
            <div>
              <label className="label mb-1" htmlFor="login-email">Email Address</label>
              <div className="relative flex items-center">
                <div className="absolute left-3 pointer-events-none text-ink-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="login-email"
                  type="email"
                  placeholder="you@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  className="input pl-9 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="label mb-1" htmlFor="login-password">Password</label>
              <PasswordInput id="login-password" value={password} onChange={setPassword} autoComplete="current-password" />
            </div>

            {error && (
              <div role="alert" aria-live="polite" className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={submitting} className="btn-primary w-full py-2.5 shadow-sm active:scale-[0.98] transition-all">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Logging in...</span>
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-500">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-semibold text-brand-600 hover:underline">
              Register here
            </Link>
          </p>

          <Link href="/" className="mt-4 flex items-center justify-center gap-1 text-xs font-semibold text-ink-400 transition-colors hover:text-brand-600">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to home</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
