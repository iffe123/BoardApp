import { NextRequest, NextResponse } from 'next/server';
import { verifySession, authErrorResponse, AuthError } from '@/lib/auth/verify-session';
import { createAuditLog, getRequestMetadata } from '@/lib/audit-service';
import { WEBAUTHN_COOKIE_NAME } from '@/lib/webauthn';

export async function POST(request: NextRequest) {
  try {
    const { user } = await verifySession(request);
    const { tenantId } = await request.json();
    const response = NextResponse.json({ success: true });
    response.cookies.set(WEBAUTHN_COOKIE_NAME, '', { httpOnly: true, secure: true, sameSite: 'lax', path: '/', expires: new Date(0) });

    if (tenantId) {
      const { actorIp, actorUserAgent } = getRequestMetadata(request);
      await createAuditLog({
        tenantId,
        action: 'webauthn_stepup_revoked',
        resourceType: 'settings',
        resourceId: user.uid,
        actorId: user.uid,
        actorName: user.name || user.email || 'Unknown',
        actorIp,
        actorUserAgent,
      });
    }

    return response;
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    return NextResponse.json({ error: 'Failed to revoke session' }, { status: 500 });
  }
}
