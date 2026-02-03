/**
 * Calendar Service Tests
 *
 * Tests the calendar service functionality including:
 * - iCal event generation
 * - Meeting invitations
 * - Calendar URL generation
 */

import {
  generateICalEvent,
  generateICalCancellation,
  generateMeetingICalEvent,
  generateMeetingUpdateICalEvent,
  generateMeetingCancellationICalEvent,
  generateMeetingCalendarUid,
  parseICalEvent,
  createICalDataUrl,
  createGoogleCalendarUrl,
  createOutlookCalendarUrl,
  type CalendarEventData,
  type MeetingCalendarData,
} from '@/lib/calendar-service';

describe('Calendar Service', () => {
  describe('generateICalEvent', () => {
    const baseEvent: CalendarEventData = {
      uid: 'test-event-123',
      title: 'Test Meeting',
      description: 'A test meeting description',
      startTime: new Date('2024-02-15T09:00:00Z'),
      endTime: new Date('2024-02-15T11:00:00Z'),
      timezone: 'Europe/Stockholm',
      location: {
        type: 'physical',
        address: '123 Main St, Stockholm',
        room: 'Conference Room A',
      },
      organizer: {
        email: 'organizer@example.com',
        name: 'Meeting Organizer',
      },
    };

    it('should generate valid iCal content', () => {
      const ical = generateICalEvent(baseEvent);

      expect(ical).toContain('BEGIN:VCALENDAR');
      expect(ical).toContain('END:VCALENDAR');
      expect(ical).toContain('BEGIN:VEVENT');
      expect(ical).toContain('END:VEVENT');
    });

    it('should include event UID', () => {
      const ical = generateICalEvent(baseEvent);

      expect(ical).toContain('UID:test-event-123');
    });

    it('should include event title', () => {
      const ical = generateICalEvent(baseEvent);

      expect(ical).toContain('SUMMARY:Test Meeting');
    });

    it('should include event description', () => {
      const ical = generateICalEvent(baseEvent);

      expect(ical).toContain('DESCRIPTION:A test meeting description');
    });

    it('should include location', () => {
      const ical = generateICalEvent(baseEvent);

      expect(ical).toContain('LOCATION:');
      expect(ical).toContain('Conference Room A');
      expect(ical).toContain('123 Main St');
    });

    it('should include organizer', () => {
      const ical = generateICalEvent(baseEvent);

      expect(ical).toContain('ORGANIZER');
      expect(ical).toContain('organizer@example.com');
    });

    it('should include timezone information', () => {
      const ical = generateICalEvent(baseEvent);

      expect(ical).toContain('BEGIN:VTIMEZONE');
      expect(ical).toContain('TZID:Europe/Stockholm');
    });

    it('should include DTSTART and DTEND', () => {
      const ical = generateICalEvent(baseEvent);

      expect(ical).toContain('DTSTART');
      expect(ical).toContain('DTEND');
    });

    it('should include DTSTAMP', () => {
      const ical = generateICalEvent(baseEvent);

      expect(ical).toContain('DTSTAMP');
    });

    it('should include attendees when provided', () => {
      const eventWithAttendees: CalendarEventData = {
        ...baseEvent,
        attendees: [
          { email: 'attendee1@example.com', name: 'Attendee One', role: 'REQ-PARTICIPANT' },
          { email: 'attendee2@example.com', name: 'Attendee Two', role: 'OPT-PARTICIPANT' },
        ],
      };

      const ical = generateICalEvent(eventWithAttendees);

      expect(ical).toContain('ATTENDEE');
      expect(ical).toContain('attendee1@example.com');
      expect(ical).toContain('attendee2@example.com');
    });

    it('should include default alarms', () => {
      const ical = generateICalEvent(baseEvent);

      expect(ical).toContain('BEGIN:VALARM');
      expect(ical).toContain('END:VALARM');
      expect(ical).toContain('ACTION:DISPLAY');
      expect(ical).toContain('TRIGGER:');
    });

    it('should set METHOD to REQUEST by default', () => {
      const ical = generateICalEvent(baseEvent);

      expect(ical).toContain('METHOD:REQUEST');
    });

    it('should include video conference URL for virtual meetings', () => {
      const virtualEvent: CalendarEventData = {
        ...baseEvent,
        location: {
          type: 'virtual',
          videoConferenceUrl: 'https://meet.example.com/abc123',
        },
      };

      const ical = generateICalEvent(virtualEvent);

      expect(ical).toContain('https://meet.example.com/abc123');
    });

    it('should escape special characters in text', () => {
      const eventWithSpecialChars: CalendarEventData = {
        ...baseEvent,
        title: 'Meeting; with, special\\chars',
        description: 'Description\nwith newlines',
      };

      const ical = generateICalEvent(eventWithSpecialChars);

      expect(ical).toContain('\\;');
      expect(ical).toContain('\\,');
      expect(ical).toContain('\\n');
    });

    it('should include sequence number when provided', () => {
      const eventWithSequence: CalendarEventData = {
        ...baseEvent,
        sequence: 2,
      };

      const ical = generateICalEvent(eventWithSequence);

      expect(ical).toContain('SEQUENCE:2');
    });

    it('should include status when provided', () => {
      const eventWithStatus: CalendarEventData = {
        ...baseEvent,
        status: 'CONFIRMED',
      };

      const ical = generateICalEvent(eventWithStatus);

      expect(ical).toContain('STATUS:CONFIRMED');
    });
  });

  describe('generateICalCancellation', () => {
    const baseEvent = {
      uid: 'test-event-123',
      title: 'Cancelled Meeting',
      startTime: new Date('2024-02-15T09:00:00Z'),
      endTime: new Date('2024-02-15T11:00:00Z'),
      timezone: 'Europe/Stockholm',
      organizer: {
        email: 'organizer@example.com',
      },
    };

    it('should generate cancellation with CANCEL method', () => {
      const ical = generateICalCancellation(baseEvent);

      expect(ical).toContain('METHOD:CANCEL');
    });

    it('should include STATUS:CANCELLED', () => {
      const ical = generateICalCancellation(baseEvent);

      expect(ical).toContain('STATUS:CANCELLED');
    });

    it('should include sequence number', () => {
      const ical = generateICalCancellation(baseEvent, 3);

      expect(ical).toContain('SEQUENCE:3');
    });
  });

  describe('generateMeetingICalEvent', () => {
    const meetingData: MeetingCalendarData = {
      meetingId: 'meeting-123',
      tenantId: 'tenant-1',
      title: 'Q1 Board Meeting',
      description: 'Quarterly board review',
      meetingType: 'ordinary',
      scheduledStart: new Date('2024-02-15T09:00:00Z'),
      scheduledEnd: new Date('2024-02-15T12:00:00Z'),
      timezone: 'Europe/Stockholm',
      location: {
        type: 'hybrid',
        address: '123 Business St, Stockholm',
        videoConferenceUrl: 'https://meet.example.com/board',
      },
      organizer: {
        email: 'secretary@company.com',
        name: 'Board Secretary',
      },
      attendees: [
        { email: 'ceo@company.com', name: 'CEO', role: 'chair', hasVotingRights: true },
        { email: 'cfo@company.com', name: 'CFO', role: 'director', hasVotingRights: true },
      ],
      meetingUrl: 'https://app.example.com/meetings/meeting-123',
    };

    it('should generate valid iCal for meeting', () => {
      const ical = generateMeetingICalEvent(meetingData);

      expect(ical).toContain('BEGIN:VCALENDAR');
      expect(ical).toContain('Q1 Board Meeting');
    });

    it('should include meeting UID', () => {
      const ical = generateMeetingICalEvent(meetingData);

      expect(ical).toContain('UID:meeting-meeting-123@governanceos.app');
    });

    it('should include meeting type in description', () => {
      const ical = generateMeetingICalEvent(meetingData);

      expect(ical).toContain('ordinary');
    });

    it('should include meeting URL in description', () => {
      const ical = generateMeetingICalEvent(meetingData);

      expect(ical).toContain('https://app.example.com/meetings/meeting-123');
    });

    it('should include video conference URL', () => {
      const ical = generateMeetingICalEvent(meetingData);

      expect(ical).toContain('https://meet.example.com/board');
    });

    it('should set chair as CHAIR role in attendees', () => {
      const ical = generateMeetingICalEvent(meetingData);

      expect(ical).toContain('ROLE=CHAIR');
    });

    it('should include board meeting category', () => {
      const ical = generateMeetingICalEvent(meetingData);

      expect(ical).toContain('CATEGORIES:Board Meeting');
    });

    it('should set priority to 1 (high)', () => {
      const ical = generateMeetingICalEvent(meetingData);

      expect(ical).toContain('PRIORITY:1');
    });

    it('should include multiple alarms', () => {
      const ical = generateMeetingICalEvent(meetingData);

      // Should have 3 alarms: 24h, 1h, 15min
      const alarmMatches = ical.match(/BEGIN:VALARM/g);
      expect(alarmMatches?.length).toBe(3);
    });
  });

  describe('generateMeetingUpdateICalEvent', () => {
    const meetingData: MeetingCalendarData = {
      meetingId: 'meeting-123',
      tenantId: 'tenant-1',
      title: 'Updated Board Meeting',
      meetingType: 'ordinary',
      scheduledStart: new Date('2024-02-20T09:00:00Z'),
      scheduledEnd: new Date('2024-02-20T12:00:00Z'),
      timezone: 'Europe/Stockholm',
      location: { type: 'virtual', videoConferenceUrl: 'https://meet.example.com' },
      organizer: { email: 'secretary@company.com' },
      attendees: [],
      meetingUrl: 'https://app.example.com/meetings/meeting-123',
    };

    it('should include sequence number for updates', () => {
      const ical = generateMeetingUpdateICalEvent(meetingData, 2);

      expect(ical).toContain('SEQUENCE:2');
    });
  });

  describe('generateMeetingCancellationICalEvent', () => {
    const meetingData = {
      meetingId: 'meeting-123',
      title: 'Cancelled Meeting',
      scheduledStart: new Date('2024-02-15T09:00:00Z'),
      scheduledEnd: new Date('2024-02-15T12:00:00Z'),
      timezone: 'Europe/Stockholm',
      organizer: { email: 'secretary@company.com' },
    };

    it('should generate cancellation event', () => {
      const ical = generateMeetingCancellationICalEvent(meetingData, 1);

      expect(ical).toContain('METHOD:CANCEL');
      expect(ical).toContain('STATUS:CANCELLED');
      expect(ical).toContain('SEQUENCE:1');
    });

    it('should include meeting UID', () => {
      const ical = generateMeetingCancellationICalEvent(meetingData, 1);

      expect(ical).toContain('UID:meeting-meeting-123@governanceos.app');
    });
  });

  describe('generateMeetingCalendarUid', () => {
    it('should generate consistent UID format', () => {
      const uid = generateMeetingCalendarUid('meeting-123');

      expect(uid).toBe('meeting-meeting-123@governanceos.app');
    });
  });

  describe('parseICalEvent', () => {
    it('should parse basic iCal event', () => {
      const icalContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:test-123
SUMMARY:Test Event
DESCRIPTION:Test description
STATUS:CONFIRMED
SEQUENCE:1
END:VEVENT
END:VCALENDAR`;

      const parsed = parseICalEvent(icalContent);

      expect(parsed).toBeDefined();
      expect(parsed?.uid).toBe('test-123');
      expect(parsed?.title).toBe('Test Event');
      expect(parsed?.description).toBe('Test description');
      expect(parsed?.status).toBe('CONFIRMED');
      expect(parsed?.sequence).toBe(1);
    });

    it('should handle escaped characters', () => {
      const icalContent = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:test-123
SUMMARY:Meeting\\; Important\\, Urgent
DESCRIPTION:Line 1\\nLine 2
END:VEVENT
END:VCALENDAR`;

      const parsed = parseICalEvent(icalContent);

      expect(parsed?.title).toBe('Meeting; Important, Urgent');
      expect(parsed?.description).toBe('Line 1\nLine 2');
    });

    it('should return null for invalid iCal', () => {
      const parsed = parseICalEvent('not valid ical content');

      expect(parsed).toBeNull();
    });

    it('should return null for iCal without UID', () => {
      const icalContent = `BEGIN:VCALENDAR
BEGIN:VEVENT
SUMMARY:Event without UID
END:VEVENT
END:VCALENDAR`;

      const parsed = parseICalEvent(icalContent);

      expect(parsed).toBeNull();
    });
  });

  describe('createICalDataUrl', () => {
    it('should create valid data URL', () => {
      const icalContent = 'BEGIN:VCALENDAR\nVERSION:2.0\nEND:VCALENDAR';
      const dataUrl = createICalDataUrl(icalContent);

      expect(dataUrl).toMatch(/^data:text\/calendar;base64,/);
    });

    it('should encode content as base64', () => {
      const icalContent = 'BEGIN:VCALENDAR';
      const dataUrl = createICalDataUrl(icalContent);
      const base64Part = dataUrl.replace('data:text/calendar;base64,', '');

      expect(Buffer.from(base64Part, 'base64').toString()).toBe(icalContent);
    });
  });

  describe('createGoogleCalendarUrl', () => {
    it('should create valid Google Calendar URL', () => {
      const event = {
        title: 'Test Event',
        description: 'Test description',
        startTime: new Date('2024-02-15T09:00:00Z'),
        endTime: new Date('2024-02-15T11:00:00Z'),
        location: '123 Main St',
      };

      const url = createGoogleCalendarUrl(event);

      expect(url).toContain('https://calendar.google.com/calendar/render');
      expect(url).toContain('action=TEMPLATE');
      expect(url).toContain('text=Test+Event');
      expect(url).toContain('details=Test+description');
      expect(url).toContain('location=123+Main+St');
      expect(url).toContain('dates=');
    });

    it('should handle events without optional fields', () => {
      const event = {
        title: 'Simple Event',
        startTime: new Date('2024-02-15T09:00:00Z'),
        endTime: new Date('2024-02-15T11:00:00Z'),
      };

      const url = createGoogleCalendarUrl(event);

      expect(url).toContain('text=Simple+Event');
      expect(url).toContain('dates=');
    });
  });

  describe('createOutlookCalendarUrl', () => {
    it('should create valid Outlook Calendar URL', () => {
      const event = {
        title: 'Test Event',
        description: 'Test description',
        startTime: new Date('2024-02-15T09:00:00Z'),
        endTime: new Date('2024-02-15T11:00:00Z'),
        location: '123 Main St',
      };

      const url = createOutlookCalendarUrl(event);

      expect(url).toContain('https://outlook.live.com/calendar');
      expect(url).toContain('subject=Test+Event');
      expect(url).toContain('body=Test+description');
      expect(url).toContain('location=123+Main+St');
      expect(url).toContain('startdt=');
      expect(url).toContain('enddt=');
    });

    it('should handle events without optional fields', () => {
      const event = {
        title: 'Simple Event',
        startTime: new Date('2024-02-15T09:00:00Z'),
        endTime: new Date('2024-02-15T11:00:00Z'),
      };

      const url = createOutlookCalendarUrl(event);

      expect(url).toContain('subject=Simple+Event');
    });
  });
});
