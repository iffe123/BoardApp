import { NextRequest, NextResponse } from 'next/server';
import { db, Timestamp } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { sendMeetingReminderEmail } from '@/lib/email-service';
import { notifyMeetingReminder } from '@/lib/notification-service';

/**
 * GET /api/cron/meeting-reminders
 *
 * Scheduled task to send meeting reminders.
 * Should be triggered by Vercel Cron or external scheduler.
 *
 * Sends reminders at:
 * - 24 hours before meeting
 * - 1 hour before meeting
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
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

    // Find meetings starting in 1 hour (55-65 min window)
    const oneHourWindow = {
      start: new Date(now.getTime() + 55 * 60 * 1000),
      end: new Date(now.getTime() + 65 * 60 * 1000),
    };

    // Find meetings starting in 24 hours (23.5-24.5 hr window)
    const twentyFourHourWindow = {
      start: new Date(now.getTime() + 23.5 * 60 * 60 * 1000),
      end: new Date(now.getTime() + 24.5 * 60 * 60 * 1000),
    };

    let remindersSent = 0;
    const errors: string[] = [];

    // Get all tenants
    const tenantsSnap = await getDocs(collection(db, 'tenants'));

    for (const tenantDoc of tenantsSnap.docs) {
      const tenantId = tenantDoc.id;

      try {
        // Find upcoming meetings for this tenant
        const meetingsRef = collection(db, 'tenants', tenantId, 'meetings');
        const meetingsQuery = query(
          meetingsRef,
          where('status', 'in', ['scheduled', 'draft']),
          where('scheduledStart', '>=', Timestamp.fromDate(oneHourWindow.start)),
          where('scheduledStart', '<=', Timestamp.fromDate(twentyFourHourWindow.end))
        );

        const meetingsSnap = await getDocs(meetingsQuery);

        for (const meetingDoc of meetingsSnap.docs) {
          const meeting = meetingDoc.data();
          const scheduledStart = meeting.scheduledStart?.toDate();

          if (!scheduledStart) continue;

          // Determine reminder type
          let hoursUntil: number;
          if (
            scheduledStart >= oneHourWindow.start &&
            scheduledStart <= oneHourWindow.end
          ) {
            hoursUntil = 1;
          } else if (
            scheduledStart >= twentyFourHourWindow.start &&
            scheduledStart <= twentyFourHourWindow.end
          ) {
            hoursUntil = 24;
          } else {
            continue;
          }

          // Send reminders to all attendees who accepted
          const attendees = meeting.attendees || [];
          for (const attendee of attendees) {
            if (attendee.response === 'declined') continue;

            try {
              // Send in-app notification
              await notifyMeetingReminder(
                tenantId,
                attendee.userId,
                meetingDoc.id,
                meeting.title,
                hoursUntil
              );

              // Send email reminder
              if (attendee.guestEmail || attendee.userId) {
                const email = attendee.guestEmail || `${attendee.userId}@placeholder.com`;
                await sendMeetingReminderEmail({
                  recipientName: attendee.displayName || attendee.guestName || '',
                  recipientEmail: email,
                  meetingTitle: meeting.title,
                  scheduledStart,
                  timezone: meeting.timezone || 'Europe/Stockholm',
                  meetingUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/${tenantId}/meetings/${meetingDoc.id}`,
                  hoursUntilMeeting: hoursUntil,
                });
              }

              remindersSent++;
            } catch (e) {
              errors.push(
                `Failed to notify ${attendee.userId} for meeting ${meetingDoc.id}: ${e instanceof Error ? e.message : 'Unknown'}`
              );
            }
          }
        }
      } catch (e) {
        errors.push(
          `Failed to process tenant ${tenantId}: ${e instanceof Error ? e.message : 'Unknown'}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      remindersSent,
      errors,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('Meeting reminders cron error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cron job failed' },
      { status: 500 }
    );
  }
}
