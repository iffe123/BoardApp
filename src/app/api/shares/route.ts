import { NextRequest, NextResponse } from 'next/server';
import { verifySession, verifyTenantAccess, authErrorResponse, AuthError } from '@/lib/auth/verify-session';
import { checkRateLimit, RateLimits } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { sharesDAL } from '@/lib/dal/shares';

// GET /api/shares - List all share entries for a tenant
export async function GET(request: NextRequest) {
  try {
    const { user } = await verifySession(request);

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const activeOnly = searchParams.get('activeOnly') !== 'false';
    const shareholderId = searchParams.get('shareholderId');

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

    let shares;
    if (shareholderId) {
      shares = await sharesDAL.listByShareholder(tenantId, shareholderId);
    } else if (activeOnly) {
      shares = await sharesDAL.listActive(tenantId);
    } else {
      shares = await sharesDAL.list(tenantId);
    }

    return NextResponse.json({
      shares,
      total: shares.length,
    });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    logger.error('Error fetching shares', error);
    return NextResponse.json(
      { error: 'Failed to fetch shares' },
      { status: 500 }
    );
  }
}
