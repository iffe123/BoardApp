import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { syncFortnoxFinancials } from '@/lib/fortnox-service';
import { syncVismaFinancials } from '@/lib/visma-service';
import { createAuditLog } from '@/lib/audit-service';

/**
 * GET /api/cron/sync-financials
 *
 * Scheduled task to automatically sync financial data from connected ERPs.
 * Should be triggered daily by Vercel Cron or external scheduler.
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!db) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      );
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    let totalSynced = 0;
    const errors: string[] = [];
    const tenantsProcessed: string[] = [];

    // Get all tenants
    const tenantsSnap = await getDocs(collection(db, 'tenants'));

    for (const tenantDoc of tenantsSnap.docs) {
      const tenantId = tenantDoc.id;

      try {
        // Find active ERP connections for this tenant
        const erpRef = collection(db, 'tenants', tenantId, 'erp_connections');
        const erpQuery = query(
          erpRef,
          where('status', '==', 'active'),
          where('syncEnabled', '==', true)
        );
        const erpSnap = await getDocs(erpQuery);

        for (const erpDoc of erpSnap.docs) {
          const connection = erpDoc.data();

          // Check sync frequency
          const lastSync = connection.lastSyncAt?.toDate();
          const syncFrequency = connection.syncFrequency || 'daily';

          if (lastSync) {
            const hoursSinceSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);

            switch (syncFrequency) {
              case 'daily':
                if (hoursSinceSync < 20) continue; // Skip if synced within 20 hours
                break;
              case 'weekly':
                if (hoursSinceSync < 144) continue; // ~6 days
                break;
              case 'monthly':
                if (hoursSinceSync < 648) continue; // ~27 days
                break;
              case 'manual':
                continue; // Skip manual-only connections
            }
          }

          // Sync current month and previous month
          const months = currentMonth === 1
            ? [12, 1]
            : [currentMonth - 1, currentMonth];

          try {
            let result: { synced: number; errors: string[] };

            switch (connection.provider) {
              case 'fortnox':
                result = await syncFortnoxFinancials(tenantId, currentYear, months);
                break;
              case 'visma':
                result = await syncVismaFinancials(tenantId, currentYear, months);
                break;
              default:
                continue;
            }

            totalSynced += result.synced;
            if (result.errors.length > 0) {
              errors.push(...result.errors.map((e) => `${tenantId}/${connection.provider}: ${e}`));
            }

            tenantsProcessed.push(tenantId);

            await createAuditLog({
              tenantId,
              action: 'financial.auto_synced',
              resourceType: 'financial',
              resourceId: tenantId,
              actorId: 'cron-job',
              actorName: 'Scheduled Sync',
              metadata: {
                provider: connection.provider,
                year: currentYear,
                months,
                synced: result.synced,
                errors: result.errors.length,
              },
            });
          } catch (e) {
            errors.push(
              `${tenantId}/${connection.provider}: ${e instanceof Error ? e.message : 'Sync failed'}`
            );
          }
        }
      } catch (e) {
        errors.push(
          `Tenant ${tenantId}: ${e instanceof Error ? e.message : 'Processing failed'}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      totalSynced,
      tenantsProcessed: tenantsProcessed.length,
      errors,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('Financial sync cron error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cron job failed' },
      { status: 500 }
    );
  }
}
