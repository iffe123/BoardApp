import { NextRequest, NextResponse } from 'next/server';
import { getFortnoxAuthUrl, mockFortnoxConnect } from '@/lib/fortnox-service';
import { createAuditLog } from '@/lib/audit-service';

const USE_MOCK = process.env.FORTNOX_USE_MOCK === 'true' || !process.env.FORTNOX_CLIENT_ID;

// POST /api/integrations/fortnox/connect - Initiate Fortnox OAuth flow
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, userId, userName } = body;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      );
    }

    // Use mock for development
    if (USE_MOCK) {
      await mockFortnoxConnect(tenantId);

      // Create audit log
      await createAuditLog({
        tenantId,
        action: 'financial.erp_connected',
        resourceType: 'financial',
        resourceId: tenantId,
        actorId: userId || 'unknown',
        actorName: userName || 'Unknown',
        metadata: {
          provider: 'fortnox',
          isMock: true,
        },
      });

      return NextResponse.json({
        success: true,
        isMock: true,
        message: 'Mock Fortnox connection established',
      });
    }

    // Real OAuth flow
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/fortnox/callback`;
    const authUrl = getFortnoxAuthUrl(tenantId, redirectUri);

    return NextResponse.json({
      success: true,
      authUrl,
    });
  } catch (error) {
    console.error('Fortnox connect error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initiate connection' },
      { status: 500 }
    );
  }
}
