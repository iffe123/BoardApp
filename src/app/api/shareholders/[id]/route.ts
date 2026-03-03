import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { shareholdersDAL } from '@/lib/dal/shareholders';
import { sharesDAL } from '@/lib/dal/shares';
import { logger } from '@/lib/logger';
import { AuthError, authErrorResponse, verifySession, verifyTenantAccess } from '@/lib/auth/verify-session';
import { requireTenantAccess, withIdempotency, writeAuditEvent } from '@/lib/actions/server';
import { toErrorResponse } from '@/lib/actions/errors';
import type { Shareholder } from '@/types/schema';

const updateSchema = z.object({
  tenantId: z.string().min(1),
  name: z.string().min(1).optional(),
  type: z.enum(['individual', 'company', 'fund']).optional(),
  organizationNumber: z.string().optional(),
  email: z.string().email().optional(),
  address: z.object({ street: z.string().optional(), postalCode: z.string().optional(), city: z.string().optional(), country: z.string().optional() }).optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await verifySession(request);
    const { id } = await params;
    const tenantId = new URL(request.url).searchParams.get('tenantId');
    if (!tenantId) return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    await verifyTenantAccess(user, tenantId);
    const shareholder = await shareholdersDAL.get(tenantId, id);
    if (!shareholder) return NextResponse.json({ error: 'Shareholder not found' }, { status: 404 });
    const shares = await sharesDAL.listByShareholder(tenantId, id);
    return NextResponse.json({ shareholder, shares });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    logger.error('Error fetching shareholder', error);
    return NextResponse.json({ error: 'Failed to fetch shareholder' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 422 });
    const user = await requireTenantAccess(request, parsed.data.tenantId, ['owner', 'admin']);
    const result = await withIdempotency(parsed.data.tenantId, request.headers.get('x-idempotency-key'), async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { tenantId: _tid, ...updateFields } = parsed.data;
      await shareholdersDAL.update(parsed.data.tenantId, id, updateFields as Partial<Shareholder>);
      await writeAuditEvent(parsed.data.tenantId, user.uid, 'shareholder.update', 'success', { shareholderId: id });
      return { shareholderId: id };
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    const mapped = toErrorResponse(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const tenantId = body.tenantId;
    if (!tenantId) return NextResponse.json({ error: 'tenantId is required' }, { status: 422 });
    const user = await requireTenantAccess(request, tenantId, ['owner', 'admin']);
    const result = await withIdempotency(tenantId, request.headers.get('x-idempotency-key'), async () => {
      await shareholdersDAL.softDelete(tenantId, id, user.uid);
      await writeAuditEvent(tenantId, user.uid, 'shareholder.delete', 'success', { shareholderId: id });
      return { shareholderId: id };
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    const mapped = toErrorResponse(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
