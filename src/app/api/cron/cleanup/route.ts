import { NextRequest, NextResponse } from 'next/server';
import { db, Timestamp } from '@/lib/firebase';
import { collection, getDocs, query, where, writeBatch } from 'firebase/firestore';

/**
 * GET /api/cron/cleanup
 *
 * Scheduled maintenance task to clean up:
 * - Old read notifications (> 30 days)
 * - Expired documents past retention period
 * - Stale pending signatures (> 7 days)
 *
 * Should be triggered weekly by Vercel Cron.
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
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let notificationsDeleted = 0;
    let signaturesExpired = 0;
    const errors: string[] = [];

    // Process each tenant
    const tenantsSnap = await getDocs(collection(db, 'tenants'));

    for (const tenantDoc of tenantsSnap.docs) {
      const tenantId = tenantDoc.id;

      try {
        // Clean up old read notifications
        const notificationsRef = collection(db, 'tenants', tenantId, 'notifications');
        const oldNotificationsQuery = query(
          notificationsRef,
          where('read', '==', true),
          where('createdAt', '<', Timestamp.fromDate(thirtyDaysAgo))
        );

        const oldNotifications = await getDocs(oldNotificationsQuery);

        if (!oldNotifications.empty) {
          const batch = writeBatch(db);
          let batchCount = 0;

          for (const notifDoc of oldNotifications.docs) {
            batch.delete(notifDoc.ref);
            batchCount++;
            notificationsDeleted++;

            if (batchCount >= 500) {
              await batch.commit();
              batchCount = 0;
            }
          }

          if (batchCount > 0) {
            await batch.commit();
          }
        }

        // Clean up stale pending signatures
        const signaturesRef = collection(db, 'tenants', tenantId, 'signatures');
        const staleSignaturesQuery = query(
          signaturesRef,
          where('status', '==', 'pending'),
          where('createdAt', '<', Timestamp.fromDate(sevenDaysAgo))
        );

        const staleSignatures = await getDocs(staleSignaturesQuery);

        if (!staleSignatures.empty) {
          const batch = writeBatch(db);
          let batchCount = 0;

          for (const sigDoc of staleSignatures.docs) {
            batch.update(sigDoc.ref, {
              status: 'expired',
              updatedAt: Timestamp.now(),
            });
            batchCount++;
            signaturesExpired++;

            if (batchCount >= 500) {
              await batch.commit();
              batchCount = 0;
            }
          }

          if (batchCount > 0) {
            await batch.commit();
          }
        }
      } catch (e) {
        errors.push(
          `Tenant ${tenantId}: ${e instanceof Error ? e.message : 'Cleanup failed'}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      notificationsDeleted,
      signaturesExpired,
      errors,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('Cleanup cron error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cron job failed' },
      { status: 500 }
    );
  }
}
