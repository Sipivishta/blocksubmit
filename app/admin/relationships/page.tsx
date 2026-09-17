// Admin relationship management: /admin/relationships
// Lets an admin link/unlink teacher<->student pairs via
// teacher_student_links (supabase/migrations/0006_teacher_student_links.sql).
// This is the only place such links can be created or removed — neither
// teachers nor students have any write access to this table (see that
// migration's RLS policies).
export const runtime = 'nodejs';

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireRole, UnauthorizedError, ForbiddenError } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase-server';
import { AppShell } from '@/components/AppShell';
import { RelationshipManager } from '@/components/RelationshipManager';
import { dashboardPathForRole } from '@/lib/redirect-for-role';
import type { Profile } from '@/types';

export default async function AdminRelationshipsPage() {
  try {
    await requireRole('ADMIN');
  } catch (err) {
    if (err instanceof UnauthorizedError) redirect('/login');
    if (err instanceof ForbiddenError) redirect(dashboardPathForRole('STUDENT'));
    throw err;
  }

  const supabase = await createServerClient();
  const [{ data: teachers }, { data: students }, { data: links }] = await Promise.all([
    supabase.from('profiles').select('id, full_name').eq('role', 'TEACHER').order('full_name'),
    supabase.from('profiles').select('id, full_name').eq('role', 'STUDENT').order('full_name'),
    supabase.from('teacher_student_links').select('id, teacher_id, student_id')
  ]);

  return (
    <AppShell title="Relationships">
      <div className="mx-auto max-w-6xl p-4 sm:p-8">
        <Link href="/admin" className="text-sm text-ink-400 hover:text-ink-900">
          ← Admin
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-ink-900">Teacher ↔ student relationships</h1>
        <p className="mt-1 text-sm text-ink-500">
          Control which teachers a student can see assignments from and submit work to. Unlinking never
          deletes assignments, submissions, grades, or audit history — it only changes access going forward.
        </p>

        <div className="mt-6">
          <RelationshipManager
            teachers={(teachers ?? []) as Pick<Profile, 'id' | 'full_name'>[]}
            students={(students ?? []) as Pick<Profile, 'id' | 'full_name'>[]}
            links={(links ?? []) as { id: string; teacher_id: string; student_id: string }[]}
          />
        </div>
      </div>
    </AppShell>
  );
}
