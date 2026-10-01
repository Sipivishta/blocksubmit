'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';
import { dashboardPathForRole } from '@/lib/redirect-for-role';
import type { Profile, UserRole } from '@/types';
import Image from 'next/image';
import blocksubmitLogo from '@/app/public/branding/blocksubmit-logo.png';
import { 
  LayoutDashboard, 
  UserCheck, 
  Users, 
  GitFork, 
  LogOut, 
  Menu, 
  X, 
  Shield 
} from 'lucide-react';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'U';
}

const ROLE_BADGE_STYLE: Record<UserRole, string> = {
  STUDENT: 'bg-brand-500/20 text-brand-300 border border-brand-500/30',
  TEACHER: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
  ADMIN: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
};

const ROLE_NAV: Record<UserRole, { label: string; href: string; icon: React.ComponentType<{ className?: string }> }[]> = {
  STUDENT: [{ label: 'Dashboard', href: '/student', icon: LayoutDashboard }],
  TEACHER: [{ label: 'Dashboard', href: '/teacher', icon: LayoutDashboard }],
  ADMIN: [
    { label: 'Overview', href: '/admin', icon: LayoutDashboard },
    { label: 'Teachers', href: '/admin/teachers', icon: UserCheck },
    { label: 'Students', href: '/admin/students', icon: Users },
    { label: 'Relationships', href: '/admin/relationships', icon: GitFork }
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
      <aside className="hidden w-64 shrink-0 bg-ink-950 text-white lg:flex lg:flex-col border-r border-white/5">
        <div className="border-b border-white/10 px-5 py-4">
          <div className="w-fit rounded-lg bg-white p-1.5 shadow-sm">
            <Image
              src={blocksubmitLogo}
              alt="BlockSubmit Integrity Platform"
              width={124}
              height={38}
              priority
              className="object-contain object-left"
            />
          </div>
        </div>

        <nav className="flex-1 space-y-1.5 px-3 py-6">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
            Workspace Navigation
          </p>
          {profile &&
            ROLE_NAV[profile.role].map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== dashboardHref && pathname.startsWith(`${item.href}/`));
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
                    active
                      ? 'bg-brand-600 text-white shadow-lift'
                      : 'text-white/60 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-white' : 'text-white/50'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
        </nav>

        {profile && (
          <div className="border-t border-white/10 p-4 bg-white/[0.02]">
            <div className="flex items-center gap-3 rounded-xl p-2 bg-white/5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white shadow-sm">
                {initials(profile.full_name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-white">{profile.full_name}</p>
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                    ROLE_BADGE_STYLE[profile.role]
                  }`}
                >
                  {profile.role}
                </span>
              </div>
              <button
                onClick={handleLogout}
                title="Log out"
                className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close menu"
            className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm animate-fade-slide-in"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 bg-ink-950 p-5 text-white shadow-popover z-10 flex flex-col justify-between">
            <div>
              <div className="mb-6 flex items-center justify-between">
                <div className="w-fit rounded-lg bg-white p-1.5">
                  <Image
                    src={blocksubmitLogo}
                    alt="BlockSubmit Integrity Platform"
                    width={120}
                    height={36}
                    priority
                    className="object-contain object-left"
                  />
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg p-1.5 text-white/70 hover:bg-white/10"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="space-y-1">
                {profile &&
                  ROLE_NAV[profile.role].map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-white/70 hover:bg-white/10 hover:text-white"
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
              </nav>
            </div>

            {profile && (
              <div className="border-t border-white/10 pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                      {initials(profile.full_name)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white truncate max-w-[120px]">{profile.full_name}</p>
                      <span className="text-[10px] text-white/60 uppercase font-semibold">{profile.role}</span>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1 text-xs text-white/70 hover:text-white bg-white/10 px-2.5 py-1.5 rounded-lg"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Log out</span>
                  </button>
                </div>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex h-15 items-center justify-between border-b border-ink-200/80 bg-white/90 backdrop-blur px-4 lg:px-8 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-ink-600 hover:bg-ink-100 lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-brand-600 hidden sm:block" />
              <h1 className="text-base font-bold text-ink-900 tracking-tight">{title}</h1>
            </div>
          </div>
          {profile && (
            <div className="flex items-center gap-3">
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  ROLE_BADGE_STYLE[profile.role]
                }`}
              >
                {profile.role}
              </span>
            </div>
          )}
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
