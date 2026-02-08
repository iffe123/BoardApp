import { NextRequest, NextResponse } from 'next/server';
import { disconnectGoogle } from '@/lib/google-calendar-service';
import { createAuditLog } from '@/lib/audit-service';

// POST /api/integrations/google/disconnect - Disconnect Google Workspace integration
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

    await disconnectGoogle(tenantId);

    await createAuditLog({
      tenantId,
      action: 'settings.calendar_disconnected',
      resourceType: 'settings',
      resourceId: tenantId,
      actorId: userId || 'unknown',
      actorName: userName || 'Unknown',
      metadata: {
        provider: 'google',
        action: 'disconnected',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Google Workspace disconnected successfully',
    });
  } catch (error) {
    console.error('Google disconnect error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to disconnect Google Workspace' },
      { status: 500 }
    );
  }
}
