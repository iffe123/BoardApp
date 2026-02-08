import { NextRequest, NextResponse } from 'next/server';
import { getMicrosoftAuthUrl, mockMicrosoftConnect, MICROSOFT_USE_MOCK } from '@/lib/microsoft-calendar-service';
import { createAuditLog } from '@/lib/audit-service';

// POST /api/integrations/microsoft/connect - Initiate Microsoft OAuth flow
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
    if (MICROSOFT_USE_MOCK) {
      await mockMicrosoftConnect(tenantId);

      await createAuditLog({
        tenantId,
        action: 'settings.calendar_connected',
        resourceType: 'settings',
        resourceId: tenantId,
        actorId: userId || 'unknown',
        actorName: userName || 'Unknown',
        metadata: {
          provider: 'microsoft',
          isMock: true,
        },
      });

      return NextResponse.json({
        success: true,
        isMock: true,
        message: 'Mock Microsoft 365 connection established',
      });
    }

    // Real OAuth flow
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/microsoft/callback`;
    const authUrl = getMicrosoftAuthUrl(tenantId, redirectUri);

    return NextResponse.json({
      success: true,
      authUrl,
    });
  } catch (error) {
    console.error('Microsoft connect error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initiate connection' },
      { status: 500 }
    );
  }
}
