import { NextRequest, NextResponse } from 'next/server';
import { verifySession, verifyTenantAccess, authErrorResponse, AuthError } from '@/lib/auth/verify-session';
import { checkRateLimit, RateLimits } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { computeCapTable } from '@/lib/dal/shares';

// GET /api/shares/cap-table - Get computed cap table summary
export async function GET(request: NextRequest) {
  try {
    const { user } = await verifySession(request);

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

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

    const capTable = await computeCapTable(tenantId);

    return NextResponse.json(capTable);
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    logger.error('Error computing cap table', error);
    return NextResponse.json(
      { error: 'Failed to compute cap table' },
      { status: 500 }
    );
  }
}
