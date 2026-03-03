import { NextRequest } from 'next/server';
import {
  collection,
  doc,
  getDoc,
  runTransaction,
  setDoc,
  Timestamp,
  updateDoc,
  db,
} from '@/lib/firebase';
import { verifySession, verifyTenantAccess } from '@/lib/auth/verify-session';
import { AppError } from '@/lib/errors/AppError';

interface ActionRunRecord {
  status: 'started' | 'succeeded' | 'failed';
  createdAt: ReturnType<typeof Timestamp.now>;
  updatedAt: ReturnType<typeof Timestamp.now>;
  responsePayload?: unknown;
  error?: {
    code: string;
    message: string;
  };
}

export async function getAuthUser(req: NextRequest): Promise<{ uid: string }> {
  const { user } = await verifySession(req);
  return user;
}

export async function requireTenantAccess(userId: string, tenantId: string): Promise<void> {
  await verifyTenantAccess({ uid: userId }, tenantId);
}

export async function withIdempotency<T>(
  tenantId: string,
  idempotencyKey: string,
  fn: () => Promise<T>
): Promise<T> {
  const actionRunRef = doc(collection(db, 'tenants', tenantId, 'actionRuns'), idempotencyKey);

  const transactionResult = await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(actionRunRef);
    if (snapshot.exists()) {
      const data = snapshot.data() as ActionRunRecord;
      if (data.status === 'succeeded' && data.responsePayload !== undefined) {
        return { shouldExecute: false, cachedPayload: data.responsePayload as T };
      }

      if (data.status === 'started') {
        throw new AppError('CONFLICT', 'Action already in progress for this idempotency key');
      }

      throw new AppError('CONFLICT', 'Action already processed for this idempotency key');
    }

    transaction.set(actionRunRef, {
      status: 'started',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    return { shouldExecute: true };
  });

  if (!transactionResult.shouldExecute) {
    return transactionResult.cachedPayload as T;
  }

  try {
    const result = await fn();
    await updateDoc(actionRunRef, {
      status: 'succeeded',
      updatedAt: Timestamp.now(),
      responsePayload: result,
    });
    return result;
  } catch (error) {
    const appError = AppError.fromUnknown(error, 'Action failed');
    await updateDoc(actionRunRef, {
      status: 'failed',
      updatedAt: Timestamp.now(),
      error: {
        code: appError.code,
        message: appError.message,
      },
    });
    throw appError;
  }
}

export async function writeAuditEvent(
  tenantId: string,
  userId: string,
  action: string,
  outcome: 'success' | 'failure',
  metadata?: Record<string, unknown>
): Promise<string> {
  const eventRef = doc(collection(db, 'tenants', tenantId, 'auditEvents'));
  await setDoc(eventRef, {
    id: eventRef.id,
    tenantId,
    userId,
    action,
    outcome,
    metadata: metadata ?? {},
    createdAt: Timestamp.now(),
  });

  return eventRef.id;
}

export async function getIdempotentActionRun(
  tenantId: string,
  idempotencyKey: string
): Promise<ActionRunRecord | null> {
  const actionRunRef = doc(collection(db, 'tenants', tenantId, 'actionRuns'), idempotencyKey);
  const snapshot = await getDoc(actionRunRef);
  return snapshot.exists() ? (snapshot.data() as ActionRunRecord) : null;
}
