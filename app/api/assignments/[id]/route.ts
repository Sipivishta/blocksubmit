// PATCH  /api/assignments/[id] — update an assignment (owning TEACHER only)
// DELETE /api/assignments/[id] — delete an assignment (owning TEACHER only)
//
// Ownership is checked explicitly in application code (fetch, then compare
// teacher_id) rather than relying on RLS alone — the same defense-in-depth
// pattern used by every other ownership-sensitive route in this project
// (see verify/retry/download). RLS is still the second, independent layer:
// "assignments: teacher updates own" / "...deletes own" in
// supabase/migrations/0001_init.sql would block the write even if this
// check were ever bypassed.
import { z } from 'zod';
import { requireRole, authErrorResponse } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase-server';
import { writeAuditLog } from '@/lib/audit';
import type { Assignment } from '@/types';
import { validateMutationOrigin } from '@/lib/request-origin';

const updateAssignmentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
  deadline: z.string().datetime().optional()
});

async function loadOwnedAssignment(id: string, teacherId: string) {
  const supabase = await createServerClient();
  const { data: assignment, error } = await supabase.from('assignments').select('*').eq('id', id).single();
  if (error || !assignment) return { assignment: null, supabase };
  if ((assignment as Assignment).teacher_id !== teacherId) return { assignment: null, supabase };
  return { assignment: assignment as Assignment, supabase };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const originError = validateMutationOrigin(req);
  if (originError) return originError;

  try {
    const teacher = await requireRole('TEACHER');
    const { id } = await params;
    const parsed = updateAssignmentSchema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    if (Object.keys(parsed.data).length === 0) {
      return Response.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { assignment, supabase } = await loadOwnedAssignment(id, teacher.id);
    if (!assignment) {
      return Response.json({ error: 'Assignment not found' }, { status: 404 });
    }

    const { data: updated, error: updateError } = await supabase
      .from('assignments')
      .update({
        ...(parsed.data.title !== undefined && { title: parsed.data.title }),
        ...(parsed.data.description !== undefined && { description: parsed.data.description }),
        ...(parsed.data.deadline !== undefined && { deadline: parsed.data.deadline })
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) return Response.json({ error: updateError.message }, { status: 500 });

    await writeAuditLog({
      userId: teacher.id,
      action: 'ASSIGNMENT_UPDATED',
      resourceType: 'assignment',
      resourceId: id,
      metadata: { fields: Object.keys(parsed.data) }
    });

    return Response.json({ assignment: updated });
  } catch (err) {
    return authErrorResponse(err) ?? Response.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const originError = validateMutationOrigin(_req);
  if (originError) return originError;

  try {
    const teacher = await requireRole('TEACHER');
    const { id } = await params;
    const { assignment, supabase } = await loadOwnedAssignment(id, teacher.id);
    if (!assignment) {
      return Response.json({ error: 'Assignment not found' }, { status: 404 });
    }

    const { error: deleteError } = await supabase.from('assignments').delete().eq('id', id);

    if (deleteError) {
      // Postgres 23503 = foreign_key_violation. submissions.assignment_id
      // is ON DELETE RESTRICT specifically so a teacher can't silently
      // destroy student work that's tied to an immutable blockchain
      // record by deleting the assignment it belongs to.
      if (deleteError.code === '23503') {
        return Response.json(
          { error: 'This assignment has submissions and cannot be deleted.' },
          { status: 409 }
        );
      }
      return Response.json({ error: deleteError.message }, { status: 500 });
    }

    await writeAuditLog({
      userId: teacher.id,
      action: 'ASSIGNMENT_DELETED',
      resourceType: 'assignment',
      resourceId: id
    });

    return Response.json({ success: true });
  } catch (err) {
    return authErrorResponse(err) ?? Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
