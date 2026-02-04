import { NextRequest, NextResponse } from 'next/server';
import { syncFortnoxFinancials } from '@/lib/fortnox-service';
import { createAuditLog } from '@/lib/audit-service';

// POST /api/integrations/fortnox/sync - Sync financial data from Fortnox
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

    // Default to current year if not specified
    const syncYear = year || new Date().getFullYear();

    // Default to all months if not specified
    const syncMonths = months || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

    const result = await syncFortnoxFinancials(tenantId, syncYear, syncMonths);

    // Create audit log
    await createAuditLog({
      tenantId,
      action: 'financial.erp_synced',
      resourceType: 'financial',
      resourceId: tenantId,
      actorId: userId || 'unknown',
      actorName: userName || 'Unknown',
      metadata: {
        provider: 'fortnox',
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
    console.error('Fortnox sync error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync financial data' },
      { status: 500 }
    );
  }
}
