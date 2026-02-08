import { NextRequest, NextResponse } from 'next/server';
import { getGoogleAuthUrl, mockGoogleConnect, GOOGLE_USE_MOCK } from '@/lib/google-calendar-service';
import { createAuditLog } from '@/lib/audit-service';

// POST /api/integrations/google/connect - Initiate Google OAuth flow
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
    if (GOOGLE_USE_MOCK) {
      await mockGoogleConnect(tenantId);

      await createAuditLog({
        tenantId,
        action: 'settings.calendar_connected',
        resourceType: 'settings',
        resourceId: tenantId,
        actorId: userId || 'unknown',
        actorName: userName || 'Unknown',
        metadata: {
          provider: 'google',
          isMock: true,
        },
      });

      return NextResponse.json({
        success: true,
        isMock: true,
        message: 'Mock Google Workspace connection established',
      });
    }

    // Real OAuth flow
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/google/callback`;
    const authUrl = getGoogleAuthUrl(tenantId, redirectUri);

    return NextResponse.json({
      success: true,
      authUrl,
    });
  } catch (error) {
    console.error('Google connect error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initiate connection' },
      { status: 500 }
    );
  }
}
