/**
 * Audit Logging Service
 *
 * Provides utilities for logging user actions for compliance and audit trails.
 * Logs are stored in Firestore under /tenants/{tenantId}/audit_logs
 */

import { collections, Timestamp } from '@/lib/firebase';
import { setDoc, doc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import type { AuditLog } from '@/types/schema';

export type AuditResourceType = AuditLog['resourceType'];

export interface AuditLogInput {
  tenantId: string;
  action: string;
  resourceType: AuditResourceType;
  resourceId: string;
  actorId: string;
  actorName: string;
  actorIp?: string;
  actorUserAgent?: string;
  changes?: Array<{
    field: string;
    oldValue?: unknown;
    newValue?: unknown;
  }>;
  metadata?: Record<string, unknown>;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(input: AuditLogInput): Promise<string> {
  const id = uuidv4();
  const auditLogRef = doc(collections.auditLogs(input.tenantId), id);

  const auditLog: AuditLog = {
    id,
    tenantId: input.tenantId,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    actorId: input.actorId,
    actorName: input.actorName,
    actorIp: input.actorIp,
    actorUserAgent: input.actorUserAgent,
    changes: input.changes,
    metadata: input.metadata,
    timestamp: Timestamp.now(),
  };

  await setDoc(auditLogRef, auditLog);

  return id;
}

/**
 * Pre-defined audit actions for consistency
 */
export const AuditActions = {
  // Meeting actions
  MEETING_CREATED: 'meeting.created',
  MEETING_UPDATED: 'meeting.updated',
  MEETING_DELETED: 'meeting.deleted',
  MEETING_STARTED: 'meeting.started',
  MEETING_ENDED: 'meeting.ended',
  MEETING_CANCELLED: 'meeting.cancelled',
  AGENDA_UPDATED: 'meeting.agenda_updated',
  MINUTES_GENERATED: 'meeting.minutes_generated',
  MINUTES_SIGNED: 'meeting.minutes_signed',

  // Document actions
  DOCUMENT_UPLOADED: 'document.uploaded',
  DOCUMENT_DOWNLOADED: 'document.downloaded',
  DOCUMENT_DELETED: 'document.deleted',
  DOCUMENT_SHARED: 'document.shared',
  DOCUMENT_SIGNED: 'document.signed',

  // Member actions
  MEMBER_INVITED: 'member.invited',
  MEMBER_JOINED: 'member.joined',
  MEMBER_REMOVED: 'member.removed',
  MEMBER_ROLE_CHANGED: 'member.role_changed',

  // Financial actions
  FINANCIAL_DATA_IMPORTED: 'financial.data_imported',
  FINANCIAL_REPORT_GENERATED: 'financial.report_generated',
  ERP_CONNECTED: 'financial.erp_connected',
  ERP_SYNCED: 'financial.erp_synced',

  // Decision actions
  DECISION_RECORDED: 'decision.recorded',
  DECISION_UPDATED: 'decision.updated',

  // Settings actions
  SETTINGS_UPDATED: 'settings.updated',
  ORGANIZATION_UPDATED: 'settings.organization_updated',
  NOTIFICATION_SETTINGS_UPDATED: 'settings.notifications_updated',
  COMPLIANCE_SETTINGS_UPDATED: 'settings.compliance_updated',
} as const;

/**
 * Helper to extract request metadata for audit logs
 */
export function getRequestMetadata(request: Request): {
  actorIp?: string;
  actorUserAgent?: string;
} {
  return {
    actorIp: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
    actorUserAgent: request.headers.get('user-agent') || undefined,
  };
}
