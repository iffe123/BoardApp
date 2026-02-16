import { NextRequest, NextResponse } from 'next/server';
import { exchangeVismaCode, storeVismaConnection, getVismaCompanyInfo } from '@/lib/visma-service';
import { createAuditLog } from '@/lib/audit-service';

export const dynamic = 'force-dynamic';

// GET /api/integrations/visma/callback - Handle Visma OAuth callback
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      const errorDescription = searchParams.get('error_description') || 'Unknown error';
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=visma_auth_failed&message=${encodeURIComponent(errorDescription)}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=visma_auth_missing_params`
      );
    }

    // Decode state to get tenantId
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    const tenantId = stateData.tenantId;

    if (!tenantId) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=visma_auth_invalid_state`
      );
    }

    // Exchange code for tokens
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/visma/callback`;
    const tokens = await exchangeVismaCode(code, redirectUri);

    // Store the connection
    await storeVismaConnection(tenantId, tokens);

    // Fetch and update company info
    try {
      const companyInfo = await getVismaCompanyInfo(tenantId);
      await storeVismaConnection(tenantId, tokens, companyInfo);
    } catch {
      // Company info fetch is non-critical
    }

    // Audit log
    await createAuditLog({
      tenantId,
      action: 'financial.erp_connected',
      resourceType: 'financial',
      resourceId: tenantId,
      actorId: 'system',
      actorName: 'System',
      metadata: { provider: 'visma' },
    });

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/${tenantId}/settings?tab=integrations&success=visma_connected`
    );
  } catch (error) {
    console.error('Visma callback error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=visma_auth_failed`
    );
  }
}
