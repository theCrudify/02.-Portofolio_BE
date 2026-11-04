import type { Database } from '@/db/client';
import { lk } from '@/db/queries/lookups';
import { auditLogs } from '@/db/schema';

/** audit_action lookup codes the application writes. */
export type AuditActionType =
  | 'create'
  | 'update'
  | 'delete'
  | 'delete_permanent'
  | 'publish'
  | 'unpublish'
  | 'archive'
  | 'restore'
  | 'reorder'
  | 'login'
  | 'logout'
  | 'settings'
  | 'import';

export async function writeAuditLog(
  db: Database,
  params: {
    userId: string | null;
    action: AuditActionType;
    resource: string;
    resourceId?: string | null;
    summary?: string | null;
  },
): Promise<void> {
  await db.insert(auditLogs).values({
    userId: params.userId,
    actionId: lk('audit_action', params.action),
    resource: params.resource.slice(0, 40),
    resourceId: params.resourceId ?? null,
    summary: params.summary ? params.summary.slice(0, 300) : null,
  });
}
