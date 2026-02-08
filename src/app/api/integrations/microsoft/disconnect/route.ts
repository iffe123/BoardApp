import { NextRequest, NextResponse } from 'next/server';
import { disconnectMicrosoft } from '@/lib/microsoft-calendar-service';
import { createAuditLog } from '@/lib/audit-service';

// POST /api/integrations/microsoft/disconnect - Disconnect Microsoft 365 integration
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

    await disconnectMicrosoft(tenantId);

    await createAuditLog({
      tenantId,
      action: 'settings.calendar_disconnected',
      resourceType: 'settings',
      resourceId: tenantId,
      actorId: userId || 'unknown',
      actorName: userName || 'Unknown',
      metadata: {
        provider: 'microsoft',
        action: 'disconnected',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Microsoft 365 disconnected successfully',
    });
  } catch (error) {
    console.error('Microsoft disconnect error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to disconnect Microsoft 365' },
      { status: 500 }
    );
  }
}
