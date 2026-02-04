import { NextRequest, NextResponse } from 'next/server';
import {
  exchangeFortnoxCode,
  storeFortnoxConnection,
  getFortnoxCompanyInfo,
} from '@/lib/fortnox-service';
import { createAuditLog } from '@/lib/audit-service';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

// GET /api/integrations/fortnox/callback - Handle OAuth callback
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
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/fortnox/callback`;
    const tokens = await exchangeFortnoxCode(code, redirectUri);

    // Store connection (tokens will be used to fetch company info)
    await storeFortnoxConnection(tenantId, tokens);

    // Fetch and store company info
    try {
      const companyInfo = await getFortnoxCompanyInfo(tenantId);
      await storeFortnoxConnection(tenantId, tokens, companyInfo);
    } catch (err) {
      console.warn('Failed to fetch company info:', err);
    }

    // Create audit log
    await createAuditLog({
      tenantId,
      action: 'financial.erp_connected',
      resourceType: 'financial',
      resourceId: tenantId,
      actorId: 'system',
      actorName: 'System',
      metadata: {
        provider: 'fortnox',
      },
    });

    // Redirect back to settings with success message
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/${tenantId}/settings?tab=integrations&success=Fortnox%20connected%20successfully`
    );
  } catch (error) {
    console.error('Fortnox callback error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=${encodeURIComponent(
        error instanceof Error ? error.message : 'Failed to complete connection'
      )}`
    );
  }
}
