import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { verifySession, verifyTenantAccess, verifyTenantRole, authErrorResponse, AuthError } from '@/lib/auth/verify-session';
import { checkRateLimit, RateLimits } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { shareholdersDAL } from '@/lib/dal/shareholders';
import { ShareholderCreateSchema } from '@/types/schema';

// GET /api/shareholders - List shareholders for a tenant
export async function GET(request: NextRequest) {
  try {
    const { user } = await verifySession(request);

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const activeOnly = searchParams.get('activeOnly') !== 'false';

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      );
    }

    verifyTenantAccess(user, tenantId);

    const rateCheck = checkRateLimit(`api:${user.uid}`, RateLimits.api);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again later.' },
        { status: 429 }
      );
    }

    const shareholders = activeOnly
      ? await shareholdersDAL.listActive(tenantId)
      : await shareholdersDAL.list(tenantId);

    return NextResponse.json({
      shareholders,
      total: shareholders.length,
    });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    logger.error('Error fetching shareholders', error);
    return NextResponse.json(
      { error: 'Failed to fetch shareholders' },
      { status: 500 }
    );
  }
}

// POST /api/shareholders - Create a new shareholder
export async function POST(request: NextRequest) {
  try {
    const { user } = await verifySession(request);

    const body = await request.json();
    const { tenantId, ...shareholderData } = body;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      );
    }

    verifyTenantRole(user, tenantId, ['owner', 'admin']);

    const rateCheck = checkRateLimit(`api:${user.uid}`, RateLimits.api);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again later.' },
        { status: 429 }
      );
    }

    const parsed = ShareholderCreateSchema.safeParse(shareholderData);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const shareholderId = uuidv4();
    await shareholdersDAL.create(tenantId, shareholderId, {
      ...parsed.data,
      tenantId,
      isActive: true,
    });

    return NextResponse.json({
      id: shareholderId,
      tenantId,
      ...parsed.data,
      isActive: true,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    logger.error('Error creating shareholder', error);
    return NextResponse.json(
      { error: 'Failed to create shareholder' },
      { status: 500 }
    );
  }
}
