import { NextRequest, NextResponse } from 'next/server';
import { collections } from '@/lib/firebase';
import { generateICalFeed, type CalendarEventData } from '@/lib/calendar-service';
import { hashCalendarToken } from '@/lib/calendar-subscription-service';
import { collectionGroup, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Meeting, CalendarSubscription } from '@/types/schema';

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  return null;
}

function canAccessMeeting(meeting: Meeting, userId: string): boolean {
  if (meeting.createdBy === userId) return true;
  return (meeting.attendees || []).some((attendee) => attendee.userId === userId || attendee.memberId === userId);
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  if (!token) {
    return NextResponse.json({ error: 'Missing subscription token' }, { status: 400 });
  }

  const tokenHash = hashCalendarToken(token);
  const subscriptionsQuery = query(
    collectionGroup(db, 'calendar_subscriptions'),
    where('tokenHash', '==', tokenHash),
    where('revokedAt', '==', null),
    limit(1)
  );

  const subscriptionSnapshot = await getDocs(subscriptionsQuery);
  if (subscriptionSnapshot.empty) {
    return NextResponse.json({ error: 'Subscription not found or revoked' }, { status: 404 });
  }

  const subscription = subscriptionSnapshot.docs[0].data() as CalendarSubscription;
  const meetingsSnapshot = await getDocs(collections.meetings(subscription.tenantId));

  const meetings = meetingsSnapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() } as Meeting))
    .filter((meeting) => canAccessMeeting(meeting, subscription.userId))
    .filter((meeting) => {
      if (subscription.scope !== 'boardroom') {
        return true;
      }
      if (!subscription.boardroomId) {
        return false;
      }
      return (meeting as Meeting & { boardroomId?: string }).boardroomId === subscription.boardroomId;
    });

  const events: CalendarEventData[] = meetings
    .map((meeting) => {
      const scheduledStart = toDate(meeting.scheduledStart);
      const scheduledEnd = toDate(meeting.scheduledEnd);
      if (!scheduledStart || !scheduledEnd) {
        return null;
      }

      return {
        uid: `meeting-${meeting.id}@boardapp`,
        title: meeting.title,
        description: meeting.description,
        startTime: scheduledStart,
        endTime: scheduledEnd,
        timezone: meeting.timezone || 'UTC',
        location: meeting.location,
        organizer: {
          email: 'no-reply@boardapp.local',
          name: 'BoardApp',
        },
        status: meeting.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED',
        sequence: 0,
      } satisfies CalendarEventData;
    })
    .filter((event): event is CalendarEventData => Boolean(event));

  const ical = generateICalFeed(events, {
    calendarName: `BoardApp ${subscription.scope === 'boardroom' ? 'Boardroom' : 'Tenant'} Meetings`,
  });

  return new NextResponse(ical, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'private, max-age=60',
    },
  });
}
