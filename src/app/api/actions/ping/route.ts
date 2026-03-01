import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthUser,
  requireTenantAccess,
  withIdempotency,
  writeAuditEvent,
} from '@/lib/actions/action-server';
import { AppError } from '@/lib/errors/AppError';

function toErrorResponse(error: unknown): NextResponse {
  const appError = AppError.fromUnknown(error, 'Failed to process action');
  return NextResponse.json({ error: appError.toJSON() }, { status: appError.statusCode });
}

export async function POST(request: NextRequest) {
  const idempotencyKey = request.headers.get('x-idempotency-key');
  if (!idempotencyKey) {
    return NextResponse.json(
      { error: new AppError('VALIDATION', 'x-idempotency-key header is required').toJSON() },
      { status: 400 }
    );
  }

  const user = await getAuthUser(request);

  let tenantId: string | undefined;

  try {
    const body = (await request.json()) as { tenantId?: string };
    tenantId = body.tenantId;

    if (!tenantId) {
      throw new AppError('VALIDATION', 'tenantId is required');
    }

    await requireTenantAccess(user.uid, tenantId);

    const result = await withIdempotency(tenantId, idempotencyKey, async () => {
      const timestamp = new Date().toISOString();
      const response = { ok: true, timestamp };

      await writeAuditEvent(tenantId!, user.uid, 'actions.ping', 'success', {
        idempotencyKey,
        timestamp,
      });

      return response;
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (tenantId) {
      await writeAuditEvent(tenantId, user.uid, 'actions.ping', 'failure', {
        idempotencyKey,
        error: AppError.fromUnknown(error).toJSON(),
      }).catch(() => undefined);
    }

    return toErrorResponse(error);
  }
}
