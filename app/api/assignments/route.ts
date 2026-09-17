// GET  /api/assignments — list assignments (any authenticated user)
// POST /api/assignments — create an assignment (TEACHER only)
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase-server';
import { requireRole, authErrorResponse } from '@/lib/auth';
import { writeAuditLog } from '@/lib/audit';
import { validateMutationOrigin } from '@/lib/request-origin';

const createAssignmentSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  deadline: z.string().datetime()
});

export async function GET() {
  try {
    const supabase = await createServerClient();
    // RLS: any authenticated user can read; requireUser not strictly
    // needed here since the policy itself gates access, but we still want
    // a clean 401 for anonymous callers rather than an empty list.
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 });

    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .order('deadline', { ascending: true });

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ assignments: data });
  } catch (err) {
    return authErrorResponse(err) ?? Response.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const originError = validateMutationOrigin(req);
  if (originError) return originError;

  try {
    const teacher = await requireRole('TEACHER');
    const body = await req.json();
    const parsed = createAssignmentSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('assignments')
      .insert({
        teacher_id: teacher.id,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        deadline: parsed.data.deadline
      })
      .select()
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });

    await writeAuditLog({
      userId: teacher.id,
      action: 'assignment.create',
      resourceType: 'assignment',
      resourceId: data.id
    });

    return Response.json({ assignment: data }, { status: 201 });
  } catch (err) {
    return authErrorResponse(err) ?? Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
