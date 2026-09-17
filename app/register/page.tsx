// Registration page — uses Supabase Auth's signUp() directly; no custom
// authentication. New accounts are always created with role STUDENT (set
// in user_metadata and mirrored into profiles by the handle_new_user()
// trigger — see supabase/migrations/0001_init.sql). There is deliberately
// no role selector here: a frontend control can never grant TEACHER/ADMIN,
// since the trigger hardcodes STUDENT unless metadata says otherwise, and
// even if a client crafted a raw signUp() call with role=TEACHER in
// metadata, prevent_role_self_escalation() blocks any later role change
// that doesn't come from the service role or an acting admin — promotion
// only happens through trusted backend/database administration.
//
// Whether the user gets a session immediately or has to confirm their
// email first is controlled by the Supabase project's own "Confirm email"
// setting (Authentication → Providers → Email), not by this code — see
// README "Email confirmation (dev vs. production)". This page handles
// both outcomes: if signUp() returns a session, the user is already
// logged in and we redirect immediately; if it doesn't, we show the
// check-your-email state.
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';
import { dashboardPathForRole } from '@/lib/redirect-for-role';
import { friendlyAuthError } from '@/lib/auth-errors';
import { PasswordInput } from '@/components/PasswordInput';
import { PublicHeader } from '@/components/PublicHeader';

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
    // role is intentionally always STUDENT — see file header note.
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
      // Email confirmation is off for this Supabase project (dev/demo
      // configuration) — signUp() already returned an active session.
      router.push(dashboardPathForRole('STUDENT'));
      router.refresh();
      return;
    }

    // Email confirmation is on (production configuration) — no session
    // yet; the user must confirm before they can log in.
    setDone(true);
    setSubmitting(false);
  }

  if (done) {
    return (
      <>
        <PublicHeader minimal />
        <main className="auth-page px-4 py-14 text-center sm:py-20">
          <div className="relative mx-auto max-w-sm">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-7 shadow-card">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-xl font-bold text-white">✓</div>
            <p className="mt-4 text-base font-semibold text-emerald-800">Account created</p>
            <p className="mt-1 text-sm text-emerald-700">
              Check your email to confirm your account, then log in.
            </p>
          </div>
          <Link href="/login" className="mt-4 text-sm font-medium text-ink-900 underline">
            Go to login
          </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <PublicHeader minimal />
      <main className="auth-page px-4 py-14 sm:py-20">
        <div className="relative mx-auto max-w-sm">
        <div className="text-center">
          <p className="eyebrow">Start securely</p>
          <h1 className="mt-2 text-2xl font-semibold text-ink-900">Create your account</h1>
          <p className="mt-2 text-sm text-ink-500">Build a trusted record for every academic submission.</p>
        </div>

      <form onSubmit={handleSubmit} className="auth-surface mt-8 space-y-4">
        <div>
          <label className="label" htmlFor="register-name">Full name</label>
          <input
            id="register-name"
            type="text"
            placeholder="Jane Doe"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
            className="input mt-1"
          />
        </div>
        <div>
          <label className="label" htmlFor="register-email">Email</label>
          <input
            id="register-email"
            type="email"
            placeholder="you@university.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="input mt-1"
          />
        </div>
        <div>
          <label className="label">Password</label>
          <div className="mt-1">
            <PasswordInput id="register-password" value={password} onChange={setPassword} autoComplete="new-password" />
          </div>
          <p className="mt-1 text-xs text-ink-300">At least {MIN_PASSWORD_LENGTH} characters.</p>
        </div>
        <div>
          <label className="label">Confirm password</label>
          <div className="mt-1">
            <PasswordInput
              id="register-confirm-password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Confirm password"
              autoComplete="new-password"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full btn-primary"
        >
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-ink-400">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-ink-900 underline">
          Log in
        </Link>
      </p>
      <Link href="/" className="mt-5 block text-center text-xs font-medium text-ink-400 transition-colors hover:text-brand-600">
        ← Back to home
      </Link>
      <p className="mt-1 text-center text-xs text-ink-300">
        New accounts are students by default. Teacher and admin access is granted by an administrator.
      </p>
      </div>
      </main>
    </>
  );
}
