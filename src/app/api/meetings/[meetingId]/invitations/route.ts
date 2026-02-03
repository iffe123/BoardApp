/**
 * Meeting Invitations API Route
 *
 * Handles sending calendar invitations to meeting attendees.
 * Supports:
 * - Sending initial invitations
 * - Sending updates when meeting details change
 * - Sending cancellations
 */

import { NextRequest, NextResponse } from 'next/server';
import { collections, Timestamp } from '@/lib/firebase';
import { getDoc, updateDoc } from 'firebase/firestore';
import type { Meeting, MeetingAttendee } from '@/types/schema';
import { sendMeetingInvitationEmail, sendBulkMeetingInvitations } from '@/lib/email-service';
import {
  generateMeetingICalEvent,
  generateMeetingUpdateICalEvent,
  generateMeetingCancellationICalEvent,
  type MeetingCalendarData,
} from '@/lib/calendar-service';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

interface RouteParams {
  params: Promise<{
    meetingId: string;
  }>;
}

// ============================================================================
// GET - Get invitation status for a meeting
// ============================================================================

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { meetingId } = await params;
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId || !meetingId) {
      return NextResponse.json(
        { error: 'tenantId and meetingId are required' },
        { status: 400 }
      );
    }

    const meetingDoc = await getDoc(collections.meeting(tenantId, meetingId));

    if (!meetingDoc.exists()) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      );
    }

    const meeting = { id: meetingDoc.id, ...meetingDoc.data() } as Meeting;

    // Return invitation status for each attendee
    const invitationStatus = meeting.attendees.map(attendee => ({
      memberId: attendee.memberId,
      displayName: attendee.displayName,
      email: attendee.guestEmail,
      invitedAt: attendee.invitedAt,
      response: attendee.response,
      respondedAt: attendee.respondedAt,
    }));

    return NextResponse.json({
      meetingId,
      status: meeting.status,
      invitations: invitationStatus,
      totalInvited: invitationStatus.length,
      responses: {
        accepted: invitationStatus.filter(i => i.response === 'accepted').length,
        declined: invitationStatus.filter(i => i.response === 'declined').length,
        tentative: invitationStatus.filter(i => i.response === 'tentative').length,
        pending: invitationStatus.filter(i => i.response === 'pending').length,
      },
    });
  } catch (error) {
    console.error('Error getting invitation status:', error);
    return NextResponse.json(
      { error: 'Failed to get invitation status' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Send meeting invitations
// ============================================================================

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { meetingId } = await params;
    const body = await request.json();
    const {
      tenantId,
      action = 'send', // 'send', 'update', 'cancel'
      attendeeIds, // Optional: specific attendees to invite, otherwise all
      organizerEmail,
      organizerName,
    } = body;

    if (!tenantId || !meetingId) {
      return NextResponse.json(
        { error: 'tenantId and meetingId are required' },
        { status: 400 }
      );
    }

    // Get meeting data
    const meetingDoc = await getDoc(collections.meeting(tenantId, meetingId));

    if (!meetingDoc.exists()) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      );
    }

    const meeting = { id: meetingDoc.id, ...meetingDoc.data() } as Meeting;

    // Get tenant data for organization name
    let organizationName = 'Your Organization';
    try {
      const tenantDoc = await getDoc(collections.tenant(tenantId));
      if (tenantDoc.exists()) {
        organizationName = tenantDoc.data().name || organizationName;
      }
    } catch {
      // Use default
    }

    // Filter attendees if specific IDs provided
    let targetAttendees = meeting.attendees;
    if (attendeeIds && attendeeIds.length > 0) {
      targetAttendees = meeting.attendees.filter(a =>
        attendeeIds.includes(a.memberId)
      );
    }

    // Build meeting calendar data
    const meetingUrl = `${APP_URL}/dashboard/${tenantId}/meetings/${meetingId}`;

    const calendarData: MeetingCalendarData = {
      meetingId: meeting.id,
      tenantId: meeting.tenantId,
      title: meeting.title,
      description: meeting.description,
      meetingType: meeting.meetingType,
      scheduledStart: meeting.scheduledStart.toDate(),
      scheduledEnd: meeting.scheduledEnd.toDate(),
      timezone: meeting.timezone || 'UTC',
      location: meeting.location,
      organizer: {
        email: organizerEmail || 'noreply@governanceos.app',
        name: organizerName || 'GovernanceOS',
      },
      attendees: targetAttendees.map(a => ({
        email: a.guestEmail || `${a.userId}@user.governanceos.app`,
        name: a.displayName,
        role: a.role,
        hasVotingRights: a.hasVotingRights,
      })),
      meetingUrl,
      sequence: 0,
    };

    // Generate appropriate iCal based on action
    let icalContent: string;
    let emailSubjectPrefix = '';

    switch (action) {
      case 'cancel':
        icalContent = generateMeetingCancellationICalEvent(calendarData, 1);
        emailSubjectPrefix = 'Cancelled: ';
        break;
      case 'update':
        icalContent = generateMeetingUpdateICalEvent(calendarData, 1);
        emailSubjectPrefix = 'Updated: ';
        break;
      default:
        icalContent = generateMeetingICalEvent(calendarData);
    }

    // Send emails to all target attendees
    const attendeesWithEmails = targetAttendees.filter(a => a.guestEmail);

    const { sent, failed, errors } = await sendBulkMeetingInvitations(
      attendeesWithEmails.map(a => ({
        email: a.guestEmail!,
        name: a.displayName,
      })),
      {
        meetingTitle: `${emailSubjectPrefix}${meeting.title}`,
        meetingType: meeting.meetingType,
        organizationName,
        scheduledStart: meeting.scheduledStart.toDate(),
        scheduledEnd: meeting.scheduledEnd.toDate(),
        timezone: meeting.timezone || 'UTC',
        location: meeting.location,
        meetingUrl,
        calendarAttachment: icalContent,
      }
    );

    // Update invitation timestamps on meeting attendees
    const now = Timestamp.now();
    const updatedAttendees = meeting.attendees.map(attendee => {
      const wasTargeted = targetAttendees.some(t => t.memberId === attendee.memberId);
      if (wasTargeted) {
        return {
          ...attendee,
          invitedAt: now,
        };
      }
      return attendee;
    });

    await updateDoc(collections.meeting(tenantId, meetingId), {
      attendees: updatedAttendees,
      updatedAt: now,
    });

    return NextResponse.json({
      success: true,
      action,
      meetingId,
      invitationsSent: sent,
      invitationsFailed: failed,
      errors: errors.length > 0 ? errors : undefined,
      icalGenerated: true,
    });
  } catch (error) {
    console.error('Error sending meeting invitations:', error);
    return NextResponse.json(
      { error: 'Failed to send meeting invitations' },
      { status: 500 }
    );
  }
}

// ============================================================================
// PATCH - Update attendee response (RSVP)
// ============================================================================

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { meetingId } = await params;
    const body = await request.json();
    const {
      tenantId,
      memberId,
      response, // 'accepted', 'declined', 'tentative'
    } = body;

    if (!tenantId || !meetingId || !memberId || !response) {
      return NextResponse.json(
        { error: 'tenantId, meetingId, memberId, and response are required' },
        { status: 400 }
      );
    }

    const validResponses = ['accepted', 'declined', 'tentative'];
    if (!validResponses.includes(response)) {
      return NextResponse.json(
        { error: 'response must be: accepted, declined, or tentative' },
        { status: 400 }
      );
    }

    // Get meeting
    const meetingDoc = await getDoc(collections.meeting(tenantId, meetingId));

    if (!meetingDoc.exists()) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      );
    }

    const meeting = meetingDoc.data() as Meeting;

    // Update the specific attendee's response
    const now = Timestamp.now();
    const updatedAttendees = meeting.attendees.map(attendee => {
      if (attendee.memberId === memberId) {
        return {
          ...attendee,
          response,
          respondedAt: now,
        };
      }
      return attendee;
    });

    await updateDoc(collections.meeting(tenantId, meetingId), {
      attendees: updatedAttendees,
      updatedAt: now,
    });

    return NextResponse.json({
      success: true,
      meetingId,
      memberId,
      response,
      respondedAt: now.toDate().toISOString(),
    });
  } catch (error) {
    console.error('Error updating RSVP:', error);
    return NextResponse.json(
      { error: 'Failed to update RSVP' },
      { status: 500 }
    );
  }
}
