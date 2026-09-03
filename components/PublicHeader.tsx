'use client';

// Lightweight header for pre-authentication pages (/, /login, /register)
// and the public verification page. Same self-fetching pattern as
// AppShell — if a session exists, it links straight to the right
// dashboard and shows a logout option instead of Log in/Register.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';
import { dashboardPathForRole } from '@/lib/redirect-for-role';
import type { Profile } from '@/types';
import blocksubmitLogo from '@/app/public/branding/blocksubmit-logo.png';

export function PublicHeader({ minimal = false }: { minimal?: boolean }) {
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setProfile(null);
        return;
      }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (!cancelled) setProfile((data as Profile) ?? null);
    }
    load();
    // Re-check whenever the session actually changes (login, logout, token
    // refresh) — not just once on mount. Without this, a stale profile from
    // an earlier session can sit in state and the Dashboard link keeps
    // pointing at that old role's page even after signing out or switching
    // accounts, until a hard reload happens to remount this component.
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(() => load());
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="border-b border-ink-200/80 bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src={blocksubmitLogo}
            alt="BlockSubmit Integrity Platform"
            width={120}
            height={40}
            priority
            className="object-contain object-left"
          />
        </Link>

        {profile === null && !minimal && (
          <div className="flex items-center gap-3 text-sm">
            <Link href="/login" className="font-medium text-ink-600 hover:text-brand-600">
              Sign in
            </Link>
            <Link href="/register" className="btn-primary py-1.5">
              Get started
            </Link>
          </div>
        )}

        {profile && (
          <div className="flex items-center gap-3 text-sm">
            <Link href={dashboardPathForRole(profile.role)} className="font-medium text-ink-600 hover:text-brand-600">
              Dashboard
            </Link>
            <button onClick={handleLogout} className="btn-secondary py-1.5">
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
