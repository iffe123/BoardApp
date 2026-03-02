import { NextRequest } from 'next/server';
import { Timestamp, collections, doc, getDoc, setDoc } from '@/lib/firebase';
import { verifySession, verifyTenantAccess, verifyTenantRole } from '@/lib/auth/verify-session';
import { AppError } from '@/lib/actions/errors';

export async function requireTenantAccess(request: NextRequest, tenantId: string, roles?: string[]) {
  const { user } = await verifySession(request);
  if (!tenantId) {
    throw new AppError('VALIDATION', 'tenantId is required', 422);
  }

  if (roles && roles.length > 0) {
    await verifyTenantRole(user, tenantId, roles);
  } else {
    await verifyTenantAccess(user, tenantId);
  }

  return user;
}

export async function withIdempotency<T>(
  tenantId: string,
  idempotencyKey: string | null,
  action: () => Promise<T>
): Promise<T> {
  if (!idempotencyKey) {
    throw new AppError('VALIDATION', 'x-idempotency-key is required', 422);
  }

  const runRef = doc(collections.actionAuditEvents(tenantId), `run_${idempotencyKey}`);
  const existing = await getDoc(runRef);

  if (existing.exists()) {
    return existing.data().response as T;
  }

  const response = await action();

  await setDoc(runRef, {
    id: `run_${idempotencyKey}`,
    tenantId,
    type: 'action_run',
    status: 'success',
    response,
    createdAt: Timestamp.now(),
  });

  return response;
}

export async function writeAuditEvent(
  tenantId: string,
  userId: string,
  action: string,
  outcome: 'success' | 'failure',
  metadata?: Record<string, unknown>
) {
  const eventRef = doc(collections.actionAuditEvents(tenantId));
  await setDoc(eventRef, {
    id: eventRef.id,
    tenantId,
    userId,
    action,
    outcome,
    metadata: metadata || {},
    createdAt: Timestamp.now(),
  });
}
