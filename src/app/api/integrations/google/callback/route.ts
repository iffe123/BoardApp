import { NextRequest, NextResponse } from 'next/server';
import {
  exchangeGoogleCode,
  storeGoogleConnection,
  getGoogleUserInfo,
} from '@/lib/google-calendar-service';
import { createAuditLog } from '@/lib/audit-service';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

// GET /api/integrations/google/callback - Handle OAuth callback
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth error
    if (error) {
      const errorDescription = searchParams.get('error_description');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=${encodeURIComponent(errorDescription || error)}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=Missing%20authorization%20code`
      );
    }

    // Decode state to get tenantId
    let tenantId: string;
    try {
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      tenantId = stateData.tenantId;
    } catch {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=Invalid%20state%20parameter`
      );
    }

    // Exchange code for tokens
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/google/callback`;
    const tokens = await exchangeGoogleCode(code, redirectUri);

    // Fetch user info for display
    let userInfo;
    try {
      userInfo = await getGoogleUserInfo(tokens.accessToken);
    } catch (err) {
      console.warn('Failed to fetch Google user info:', err);
    }

    // Store connection
    await storeGoogleConnection(tenantId, tokens, userInfo);

    // Create audit log
    await createAuditLog({
      tenantId,
      action: 'settings.calendar_connected',
      resourceType: 'settings',
      resourceId: tenantId,
      actorId: 'system',
      actorName: 'System',
      metadata: {
        provider: 'google',
        accountEmail: userInfo?.email,
      },
    });

    // Redirect back to settings with success message
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/${tenantId}/settings?tab=integrations&success=Google%20Workspace%20connected%20successfully`
    );
  } catch (error) {
    console.error('Google callback error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=${encodeURIComponent(
        error instanceof Error ? error.message : 'Failed to complete connection'
      )}`
    );
  }
}
