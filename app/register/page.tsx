'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';
import { dashboardPathForRole } from '@/lib/redirect-for-role';
import { friendlyAuthError } from '@/lib/auth-errors';
import { PasswordInput } from '@/components/PasswordInput';
import { PublicHeader } from '@/components/PublicHeader';
import { Shield, User, Mail, AlertCircle, Loader2, UserPlus, ArrowLeft, CheckCircle2 } from 'lucide-react';

const MIN_PASSWORD_LENGTH = 8;

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError('Full name is required.');
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    const supabase = createBrowserSupabaseClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role: 'STUDENT' } }
    });

    if (signUpError) {
      setError(friendlyAuthError(signUpError.message));
      setSubmitting(false);
      return;
    }

    if (data.session) {
      router.push(dashboardPathForRole('STUDENT'));
      router.refresh();
      return;
    }

    setDone(true);
    setSubmitting(false);
  }

  if (done) {
    return (
      <div className="min-h-screen bg-ink-50 flex flex-col">
        <PublicHeader minimal />
        <main className="auth-page flex-1 flex items-center justify-center px-4 py-14 text-center sm:py-20">
          <div className="relative w-full max-w-md">
            <div className="rounded-2xl border border-emerald-200 bg-white p-8 shadow-popover text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-bold text-ink-900">Account Created Successfully</h2>
              <p className="text-sm text-ink-600 leading-relaxed">
                Check your inbox to confirm your email address, then sign in to access your workspace.
              </p>
              <Link href="/login" className="btn-primary w-full py-2.5 inline-block">
                Sign In to Account
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
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
            <h1 className="text-2xl font-bold tracking-tight text-ink-950">Create your account</h1>
            <p className="mt-1.5 text-sm text-ink-500">Join BlockSubmit to manage verified academic submissions</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-surface mt-8 space-y-4 bg-white p-6 sm:p-8 rounded-2xl border border-ink-200/80 shadow-popover">
            <div>
              <label className="label mb-1" htmlFor="register-name">Full Name</label>
              <div className="relative flex items-center">
                <div className="absolute left-3 pointer-events-none text-ink-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  id="register-name"
                  type="text"
                  placeholder="e.g. Jane Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  required
                  className="input pl-9 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="label mb-1" htmlFor="register-email">Email Address</label>
              <div className="relative flex items-center">
                <div className="absolute left-3 pointer-events-none text-ink-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="register-email"
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
              <label className="label mb-1">Password</label>
              <PasswordInput id="register-password" value={password} onChange={setPassword} autoComplete="new-password" />
              <p className="mt-1 text-[11px] text-ink-400">Must be at least {MIN_PASSWORD_LENGTH} characters.</p>
            </div>

            <div>
              <label className="label mb-1">Confirm Password</label>
              <PasswordInput
                id="register-confirm-password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Confirm password"
                autoComplete="new-password"
              />
            </div>

            {error && (
              <div role="alert" className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full py-2.5 shadow-sm active:scale-[0.98] transition-all"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  <span>Create Student Account</span>
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-500">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-brand-600 hover:underline">
              Sign in
            </Link>
          </p>

          <Link href="/" className="mt-4 flex items-center justify-center gap-1 text-xs font-semibold text-ink-400 transition-colors hover:text-brand-600">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to home</span>
          </Link>

          <p className="mt-4 text-center text-[11px] text-ink-400 leading-relaxed">
            Note: New accounts are registered as students by default. Instructor accounts are provisioned by an administrator.
          </p>
        </div>
      </main>
    </div>
  );
}
