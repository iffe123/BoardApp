import { NextRequest, NextResponse } from 'next/server';
import { syncMeetingToGoogle, getGoogleConnectionStatus } from '@/lib/google-calendar-service';
import { createAuditLog } from '@/lib/audit-service';

// POST /api/integrations/google/sync - Sync meetings to Google Calendar
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, userId, userName, meetings } = body;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      );
    }

    // Check connection status
    const connection = await getGoogleConnectionStatus(tenantId);
    if (!connection || connection.status !== 'active') {
      return NextResponse.json(
        { error: 'Google Workspace is not connected' },
        { status: 400 }
      );
    }

    if (!meetings || !Array.isArray(meetings) || meetings.length === 0) {
      return NextResponse.json(
        { error: 'At least one meeting is required for sync' },
        { status: 400 }
      );
    }

    // Sync each meeting
    const results: Array<{ meetingId: string; eventId?: string; error?: string }> = [];

    for (const meeting of meetings) {
      try {
        const result = await syncMeetingToGoogle(tenantId, {
          id: meeting.id,
          title: meeting.title,
          description: meeting.description,
          scheduledStart: new Date(meeting.scheduledStart),
          scheduledEnd: new Date(meeting.scheduledEnd),
          timezone: meeting.timezone || 'Europe/Stockholm',
          location: meeting.location,
          videoConferenceUrl: meeting.videoConferenceUrl,
          attendees: meeting.attendees,
        });
        results.push({ meetingId: meeting.id, eventId: result.eventId });
      } catch (err) {
        results.push({
          meetingId: meeting.id,
          error: err instanceof Error ? err.message : 'Sync failed',
        });
      }
    }

    const synced = results.filter((r) => !r.error).length;
    const failed = results.filter((r) => r.error).length;

    await createAuditLog({
      tenantId,
      action: 'settings.calendar_synced',
      resourceType: 'settings',
      resourceId: tenantId,
      actorId: userId || 'unknown',
      actorName: userName || 'Unknown',
      metadata: {
        provider: 'google',
        synced,
        failed,
      },
    });

    return NextResponse.json({
      success: true,
      synced,
      failed,
      results,
    });
  } catch (error) {
    console.error('Google sync error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync meetings' },
      { status: 500 }
    );
  }
}
