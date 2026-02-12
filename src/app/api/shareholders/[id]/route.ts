import { NextRequest, NextResponse } from 'next/server';
import { verifySession, verifyTenantAccess, verifyTenantRole, authErrorResponse, AuthError } from '@/lib/auth/verify-session';
import { checkRateLimit, RateLimits } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { shareholdersDAL } from '@/lib/dal/shareholders';
import { sharesDAL } from '@/lib/dal/shares';
import { ShareholderCreateSchema } from '@/types/schema';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/shareholders/[id] - Get a single shareholder
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { user } = await verifySession(request);
    const { id } = await params;

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      );
    }

    await verifyTenantAccess(user, tenantId);

    const rateCheck = checkRateLimit(`api:${user.uid}`, RateLimits.api);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again later.' },
        { status: 429 }
      );
    }

    const shareholder = await shareholdersDAL.get(tenantId, id);
    if (!shareholder) {
      return NextResponse.json(
        { error: 'Shareholder not found' },
        { status: 404 }
      );
    }

    // Also fetch their shares
    const shares = await sharesDAL.listByShareholder(tenantId, id);

    return NextResponse.json({ shareholder, shares });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    logger.error('Error fetching shareholder', error);
    return NextResponse.json(
      { error: 'Failed to fetch shareholder' },
      { status: 500 }
    );
  }
}

// PUT /api/shareholders/[id] - Update a shareholder
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { user } = await verifySession(request);
    const { id } = await params;

    const body = await request.json();
    const { tenantId, ...updateData } = body;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      );
    }

    await verifyTenantRole(user, tenantId, ['owner', 'admin']);

    const parsed = ShareholderCreateSchema.partial().safeParse(updateData);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await shareholdersDAL.get(tenantId, id);
    if (!existing) {
      return NextResponse.json(
        { error: 'Shareholder not found' },
        { status: 404 }
      );
    }

    await shareholdersDAL.update(tenantId, id, parsed.data);

    return NextResponse.json({ id, ...parsed.data });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    logger.error('Error updating shareholder', error);
    return NextResponse.json(
      { error: 'Failed to update shareholder' },
      { status: 500 }
    );
  }
}

// DELETE /api/shareholders/[id] - Delete a shareholder
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { user } = await verifySession(request);
    const { id } = await params;

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      );
    }

    // Only owners can delete shareholders
    await verifyTenantRole(user, tenantId, ['owner']);

    const existing = await shareholdersDAL.get(tenantId, id);
    if (!existing) {
      return NextResponse.json(
        { error: 'Shareholder not found' },
        { status: 404 }
      );
    }

    // Check for active shares
    const activeShares = await sharesDAL.listByShareholder(tenantId, id);
    if (activeShares.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete shareholder with active shares. Transfer or redeem shares first.' },
        { status: 409 }
      );
    }

    await shareholdersDAL.remove(tenantId, id);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    logger.error('Error deleting shareholder', error);
    return NextResponse.json(
      { error: 'Failed to delete shareholder' },
      { status: 500 }
    );
  }
}
