import { NextRequest, NextResponse } from 'next/server';
import { disconnectVisma } from '@/lib/visma-service';
import { createAuditLog } from '@/lib/audit-service';

// POST /api/integrations/visma/disconnect - Disconnect Visma integration
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

    await disconnectVisma(tenantId);

    await createAuditLog({
      tenantId,
      action: 'financial.erp_disconnected',
      resourceType: 'financial',
      resourceId: tenantId,
      actorId: userId || 'unknown',
      actorName: userName || 'Unknown',
      metadata: { provider: 'visma' },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Visma disconnect error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to disconnect Visma' },
      { status: 500 }
    );
  }
}
