import { NextRequest, NextResponse } from 'next/server';
import { verifySession, authErrorResponse, AuthError, verifyTenantAccess } from '@/lib/auth/verify-session';
import { getTenantSecurityPolicy, getWebAuthnSessionFromCookie, shouldRequireStepUp } from '@/lib/webauthn';

export async function GET(request: NextRequest) {
  try {
    const { user } = await verifySession(request);
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    if (!tenantId) return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    await verifyTenantAccess(user, tenantId);

    const policy = await getTenantSecurityPolicy(tenantId);
    const required = shouldRequireStepUp(policy, user.tenants?.[tenantId]);
    const session = await getWebAuthnSessionFromCookie();
    const isValid = !!session && session.tenantId === tenantId && session.userId === user.uid;

    return NextResponse.json({ required, isValid, policy });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    return NextResponse.json({ error: 'Failed to load status' }, { status: 500 });
  }
}
