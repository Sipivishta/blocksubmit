'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';
import { dashboardPathForRole } from '@/lib/redirect-for-role';
import type { Profile } from '@/types';
import blocksubmitLogo from '@/app/public/branding/blocksubmit-logo.png';
import { LayoutDashboard, LogIn, UserPlus, LogOut } from 'lucide-react';

export function PublicHeader({ minimal = false }: { minimal?: boolean }) {
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const router = useRouter();
  const supabaseRef = useRef<ReturnType<typeof createBrowserSupabaseClient> | null>(null);

  useEffect(() => {
    const supabase = supabaseRef.current ?? createBrowserSupabaseClient();
    supabaseRef.current = supabase;
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
    const supabase = supabaseRef.current;
    if (!supabase) return;
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-ink-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 group transition-transform active:scale-95">
          <Image
            src={blocksubmitLogo}
            alt="BlockSubmit Integrity Platform"
            width={130}
            height={42}
            priority
            className="object-contain object-left"
          />
        </Link>

        {profile === null && !minimal && (
          <div className="flex items-center gap-3 text-xs sm:text-sm font-semibold">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-ink-700 hover:text-brand-600 transition-colors"
            >
              <LogIn className="h-4 w-4" />
              <span>Sign In</span>
            </Link>
            <Link href="/register" className="btn-primary py-2 px-4 shadow-sm active:scale-95 transition-all">
              <UserPlus className="h-4 w-4" />
              <span>Get Started</span>
            </Link>
          </div>
        )}

        {profile && (
          <div className="flex items-center gap-3 text-xs sm:text-sm font-semibold">
            <Link
              href={dashboardPathForRole(profile.role)}
              className="btn-primary py-2 px-4 shadow-sm active:scale-95 transition-all gap-1.5"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Go to Dashboard</span>
            </Link>
            <button
              onClick={handleLogout}
              className="btn-secondary py-2 px-3 gap-1 text-ink-600 hover:text-ink-900"
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
