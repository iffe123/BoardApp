import { NextRequest, NextResponse } from 'next/server';
import { disconnectFortnox } from '@/lib/fortnox-service';
import { createAuditLog } from '@/lib/audit-service';

// POST /api/integrations/fortnox/disconnect - Disconnect Fortnox integration
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

    await disconnectFortnox(tenantId);

    // Create audit log
    await createAuditLog({
      tenantId,
      action: 'settings.updated',
      resourceType: 'settings',
      resourceId: tenantId,
      actorId: userId || 'unknown',
      actorName: userName || 'Unknown',
      metadata: {
        provider: 'fortnox',
        action: 'disconnected',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Fortnox disconnected successfully',
    });
  } catch (error) {
    console.error('Fortnox disconnect error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to disconnect Fortnox' },
      { status: 500 }
    );
  }
}
