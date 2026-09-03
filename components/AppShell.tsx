'use client';

// Application shell for authenticated pages: a left sidebar on desktop,
// a slide-out drawer on mobile, and a top bar with the page title, the
// user's role badge, and logout. Self-contained the same way the
// previous Nav component was — it fetches its own session/profile
// client-side — so no server page's data-fetching needs to change to use
// this. Public pages (/, /login, /register, /verify/[id]) intentionally
// don't use this shell; they render their own lightweight header instead,
// since a dashboard sidebar makes no sense before authentication.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';
import { dashboardPathForRole } from '@/lib/redirect-for-role';
import type { Profile, UserRole } from '@/types';
import Image from 'next/image';
import blocksubmitLogo from '@/app/public/branding/blocksubmit-logo.png';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'U';
}

const ROLE_BADGE_STYLE: Record<UserRole, string> = {
  STUDENT: 'bg-brand-50 text-brand-700',
  TEACHER: 'bg-violet-50 text-violet-700',
  ADMIN: 'bg-ink-800 text-white'
};

function NavIcon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0">
      <path d={path} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const DASHBOARD_ICON_PATH = 'M3 10.5 10 4l7 6.5M5 9v7h10V9';

const ROLE_NAV: Record<UserRole, { label: string; href: string; path: string }[]> = {
  STUDENT: [{ label: 'Dashboard', href: '/student', path: DASHBOARD_ICON_PATH }],
  TEACHER: [{ label: 'Dashboard', href: '/teacher', path: DASHBOARD_ICON_PATH }],
  ADMIN: [
    { label: 'Overview', href: '/admin', path: DASHBOARD_ICON_PATH },
    { label: 'Teachers', href: '/admin/teachers', path: 'M4 16V7l6-3 6 3v9M7 16v-4h6v4M3 17h14' },
    { label: 'Students', href: '/admin/students', path: 'M4 16c0-2 2.7-3.5 6-3.5s6 1.5 6 3.5M10 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6' }
  ]
};

export function AppShell({ title, children }: { title: string; children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
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
    // Re-check on every auth state change, not just once on mount — see
    // the identical note in components/PublicHeader.tsx for why.
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

  const dashboardHref = profile ? dashboardPathForRole(profile.role) : '/login';

  return (
    <div className="min-h-screen bg-ink-50 lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 bg-ink-950 text-white lg:flex lg:flex-col">
        <div className="border-b border-white/10 px-5 py-5">
          <div className="w-fit rounded-md bg-white px-2 py-1">
            <Image
              src={blocksubmitLogo}
              alt="BlockSubmit Integrity Platform"
              width={120}
              height={40}
              priority
              className="object-contain object-left"
            />
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-5">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">Workspace</p>
          {profile && ROLE_NAV[profile.role].map((item) => {
            const active = pathname === item.href || (item.href !== dashboardHref && pathname.startsWith(`${item.href}/`));
            return (
              <Link key={item.href} href={item.href} className={`flex items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-sm font-medium transition-colors ${active ? 'border-brand-400 bg-brand-500/15 text-white' : 'border-transparent text-white/55 hover:bg-white/5 hover:text-white'}`}>
                <NavIcon path={item.path} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        {profile && (
          <div className="border-t border-white/10 p-3">
            <div className="flex items-center gap-2.5 rounded-md px-2 py-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
                {initials(profile.full_name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{profile.full_name}</p>
                <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${ROLE_BADGE_STYLE[profile.role]}`}>
                  {profile.role}
                </span>
              </div>
                <button
                onClick={handleLogout}
                title="Log out"
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-white/60 hover:bg-white/10 hover:text-white"
              >
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                  <path
                    d="M8 4H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3M13 14l3-4-3-4M6 10h10"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>Log out</span>
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            aria-label="Close menu"
            className="absolute inset-0 bg-ink-900/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 bg-ink-950 p-4 text-white shadow-popover">
            <div className="mb-4 flex items-center justify-between">
              <div className="w-fit rounded-md bg-white px-2 py-1">
                <Image
                  src={blocksubmitLogo}
                  alt="BlockSubmit Integrity Platform"
                  width={120}
                  height={40}
                  priority
                  className="object-contain object-left"
                />
              </div>
              <button onClick={() => setMobileOpen(false)} className="rounded-md p-1.5 text-white/70 hover:bg-white/10" aria-label="Close">
                ✕
              </button>
            </div>
            {profile && ROLE_NAV[profile.role].map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className="mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white">
                <NavIcon path={item.path} />
                {item.label}
              </Link>
            ))}
            {profile && (
              <button
                onClick={handleLogout}
                className="mt-4 flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white"
              >
                Log out
              </button>
            )}
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex-1">
        <header className="flex h-14 items-center justify-between border-b border-ink-200 bg-white px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-md p-1.5 text-ink-500 hover:bg-ink-100 lg:hidden"
              aria-label="Open menu"
            >
              <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
                <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
            <h1 className="text-sm font-semibold text-ink-900">{title}</h1>
          </div>
          {profile && (
            <span className={`rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-wide lg:hidden ${ROLE_BADGE_STYLE[profile.role]}`}>
              {profile.role}
            </span>
          )}
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
