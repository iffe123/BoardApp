import { NextRequest, NextResponse } from 'next/server';
import { getMicrosoftConnectionStatus } from '@/lib/microsoft-calendar-service';
import { getGoogleConnectionStatus } from '@/lib/google-calendar-service';

// Mark this route as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

// GET /api/integrations/calendar/status - Get calendar connection status for both providers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      );
    }

    const [microsoft, google] = await Promise.all([
      getMicrosoftConnectionStatus(tenantId).catch(() => null),
      getGoogleConnectionStatus(tenantId).catch(() => null),
    ]);

    return NextResponse.json({
      microsoft: microsoft
        ? {
            status: microsoft.status,
            accountEmail: microsoft.accountEmail,
            accountName: microsoft.accountName,
            lastSyncAt: microsoft.lastSyncAt,
            lastSyncStatus: microsoft.lastSyncStatus,
            syncEnabled: microsoft.syncEnabled,
          }
        : null,
      google: google
        ? {
            status: google.status,
            accountEmail: google.accountEmail,
            accountName: google.accountName,
            lastSyncAt: google.lastSyncAt,
            lastSyncStatus: google.lastSyncStatus,
            syncEnabled: google.syncEnabled,
          }
        : null,
    });
  } catch (error) {
    console.error('Calendar status error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch calendar status' },
      { status: 500 }
    );
  }
}
