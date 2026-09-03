// Central audit-log writer. Uses the service-role client because audit
// writes must always succeed regardless of the acting user's RLS grants,
// and audit_logs has no client-facing insert policy by design.
import { createServiceRoleClient } from './supabase-server';

export async function writeAuditLog(params: {
  userId: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from('audit_logs').insert({
    user_id: params.userId,
    action: params.action,
    resource_type: params.resourceType,
    resource_id: params.resourceId ?? null,
    metadata: params.metadata ?? {}
  });

  if (error) {
    // Never let an audit-log failure break the primary flow, but do
    // surface it loudly (Sentry/console) — a silent audit gap is a bug.
    console.error('Failed to write audit log', { params, error });
  }
}
