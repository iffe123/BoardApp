import { NextRequest, NextResponse } from 'next/server';
import { syncVismaFinancials } from '@/lib/visma-service';
import { createAuditLog } from '@/lib/audit-service';

// POST /api/integrations/visma/sync - Sync financial data from Visma
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, userId, userName, year, months } = body;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      );
    }

    const syncYear = year || new Date().getFullYear();
    const syncMonths = months || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

    const result = await syncVismaFinancials(tenantId, syncYear, syncMonths);

    await createAuditLog({
      tenantId,
      action: 'financial.erp_synced',
      resourceType: 'financial',
      resourceId: tenantId,
      actorId: userId || 'unknown',
      actorName: userName || 'Unknown',
      metadata: {
        provider: 'visma',
        year: syncYear,
        monthsSynced: result.synced,
        errors: result.errors.length,
      },
    });

    return NextResponse.json({
      success: true,
      synced: result.synced,
      errors: result.errors,
    });
  } catch (error) {
    console.error('Visma sync error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync financial data' },
      { status: 500 }
    );
  }
}
