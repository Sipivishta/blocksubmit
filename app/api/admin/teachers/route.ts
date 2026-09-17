// POST /api/admin/teachers — creates a new TEACHER account (ADMIN only).
//
// This is the one legitimate use of Supabase's Admin API in this project:
// creating a user isn't something a normal signUp() can do on someone
// else's behalf, and there's no way to do it without the service-role
// key — which is exactly why this lives in a server-only route and is
// never something the browser touches directly. The created user's
// profile is populated by the existing handle_new_user() trigger (same
// path a normal registration takes) as STUDENT, then explicitly promoted
// below through the service-role client. The trigger never trusts role
// metadata from an Auth signup request.
export const runtime = 'nodejs';

import { z } from 'zod';
import { requireRole, authErrorResponse } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { writeAuditLog } from '@/lib/audit';
import { validateMutationOrigin } from '@/lib/request-origin';

const createTeacherSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1).max(200)
});

export async function POST(req: Request) {
  const originError = validateMutationOrigin(req);
  if (originError) return originError;

  try {
    const admin = await requireRole('ADMIN');
    const parsed = createTeacherSchema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const service = createServiceRoleClient();

    // Admin-created accounts get a random temporary password and an
    // invite-style email rather than a password the admin has to relay —
    // generateLink('invite', ...) both creates the auth user and returns
    // a link the new teacher can use to set their own password. If your
    // Supabase project has outbound email configured, Supabase also
    // sends this automatically; either way, no plaintext password is
    // ever generated or stored by this route.
    //
    // The trigger creates this profile as STUDENT. Role assignment is kept
    // out of Auth metadata so normal user-controlled signup cannot select
    // TEACHER or ADMIN.
    const { data, error } = await service.auth.admin.generateLink({
      type: 'invite',
      email: parsed.data.email,
      options: {
        data: {
          full_name: parsed.data.fullName
        }
      }
    });

    if (error) {
      // Never echo the raw Supabase Admin API error to the client — it
      // can include internal detail. Log server-side, return a safe
      // generic message (the one exception: "already been registered" is
      // safe and useful to surface, since it's actionable for the admin).
      console.error('Admin create-teacher failed', error);
      const message = error.message.toLowerCase().includes('already been registered')
        ? 'A user with this email already exists.'
        : 'Could not create the account.';
      return Response.json({ error: message }, { status: 400 });
    }

    const { data: teacherProfile, error: profileError } = await service
      .from('profiles')
      .update({ role: 'TEACHER' })
      .eq('id', data.user.id)
      .eq('role', 'STUDENT')
      .select('id, role')
      .maybeSingle();

    if (profileError || !teacherProfile || teacherProfile.role !== 'TEACHER') {
      console.error('Admin teacher profile promotion failed', profileError);
      return Response.json({ error: 'Could not create the teacher account.' }, { status: 500 });
    }

    await writeAuditLog({
      userId: admin.id,
      action: 'TEACHER_ACCOUNT_CREATED',
      resourceType: 'profile',
      resourceId: data.user.id,
      metadata: { email: parsed.data.email }
    });

    return Response.json(
      {
        userId: data.user.id,
        // The invite link itself — useful for the admin to copy/send
        // manually if the project's outbound email isn't configured.
        // Never a password; never logged to the console above.
        actionLink: data.properties.action_link
      },
      { status: 201 }
    );
  } catch (err) {
    return authErrorResponse(err) ?? Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
