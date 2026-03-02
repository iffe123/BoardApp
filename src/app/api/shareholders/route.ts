import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { shareholdersDAL } from '@/lib/dal/shareholders';
import { logger } from '@/lib/logger';
import { AuthError, authErrorResponse, verifySession, verifyTenantAccess } from '@/lib/auth/verify-session';
import { requireTenantAccess, withIdempotency, writeAuditEvent } from '@/lib/actions/server';
import { toErrorResponse } from '@/lib/actions/errors';

const createShareholderSchema = z.object({
  tenantId: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['individual', 'company', 'fund']),
  organizationNumber: z.string().optional(),
  email: z.string().email().optional(),
  address: z.object({
    street: z.string().optional(),
    postalCode: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { user } = await verifySession(request);
    const tenantId = new URL(request.url).searchParams.get('tenantId');
    if (!tenantId) return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    await verifyTenantAccess(user, tenantId);
    const shareholders = await shareholdersDAL.listActive(tenantId);
    return NextResponse.json({ shareholders, total: shareholders.length });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    logger.error('Error fetching shareholders', error);
    return NextResponse.json({ error: 'Failed to fetch shareholders' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createShareholderSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 422 });

    const user = await requireTenantAccess(request, parsed.data.tenantId, ['owner', 'admin']);
    const idempotencyKey = request.headers.get('x-idempotency-key');

    const result = await withIdempotency(parsed.data.tenantId, idempotencyKey, async () => {
      const shareholderId = uuidv4();
      await shareholdersDAL.create(parsed.data.tenantId, shareholderId, {
        ...parsed.data,
        tenantId: parsed.data.tenantId,
        isActive: true,
        createdBy: user.uid,
        updatedBy: user.uid,
      });
      await writeAuditEvent(parsed.data.tenantId, user.uid, 'shareholder.create', 'success', { shareholderId });
      return { shareholderId };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    const mapped = toErrorResponse(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
