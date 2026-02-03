/**
 * Calendar Service for GovernanceOS
 *
 * Handles iCal/ICS generation for:
 * - Meeting invitations
 * - Meeting updates
 * - Meeting cancellations
 *
 * Supports:
 * - RFC 5545 compliant iCalendar format
 * - Outlook, Google Calendar, Apple Calendar compatibility
 * - Recurring meeting support
 * - Attendee management
 * - Alarms/Reminders
 */

// ============================================================================
// TYPES
// ============================================================================

export interface CalendarAttendee {
  email: string;
  name?: string;
  role?: 'REQ-PARTICIPANT' | 'OPT-PARTICIPANT' | 'NON-PARTICIPANT' | 'CHAIR';
  rsvp?: boolean;
  partstat?: 'NEEDS-ACTION' | 'ACCEPTED' | 'DECLINED' | 'TENTATIVE';
}

export interface CalendarAlarm {
  action: 'DISPLAY' | 'EMAIL';
  triggerMinutesBefore: number;
  description?: string;
}

export interface CalendarLocation {
  type: 'physical' | 'virtual' | 'hybrid';
  address?: string;
  room?: string;
  videoConferenceUrl?: string;
  videoConferencePlatform?: string;
  dialInNumber?: string;
  dialInPin?: string;
}

export interface CalendarEventData {
  uid: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  timezone: string;
  location: CalendarLocation;
  organizer: {
    email: string;
    name?: string;
  };
  attendees?: CalendarAttendee[];
  alarms?: CalendarAlarm[];
  url?: string;
  categories?: string[];
  sequence?: number;
  status?: 'TENTATIVE' | 'CONFIRMED' | 'CANCELLED';
  priority?: number;
}

export interface CalendarExportOptions {
  method?: 'REQUEST' | 'CANCEL' | 'PUBLISH' | 'REPLY';
  prodId?: string;
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Format date to iCal datetime format (UTC)
 * Format: YYYYMMDDTHHMMSSZ
 */
function formatDateToICalUTC(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/**
 * Format date with timezone
 * Format: TZID=timezone:YYYYMMDDTHHMMSS
 */
function formatDateWithTimezone(date: Date, timezone: string): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `TZID=${timezone}:${year}${month}${day}T${hours}${minutes}${seconds}`;
}

/**
 * Escape special characters in iCal text
 */
function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Fold long lines according to RFC 5545 (max 75 octets per line)
 */
function foldLine(line: string): string {
  const maxLength = 75;
  if (line.length <= maxLength) {
    return line;
  }

  const result: string[] = [];
  let remaining = line;

  while (remaining.length > maxLength) {
    // First line gets full length, continuation lines start with space
    const cutLength = result.length === 0 ? maxLength : maxLength - 1;
    result.push(remaining.substring(0, cutLength));
    remaining = remaining.substring(cutLength);
  }

  if (remaining.length > 0) {
    result.push(remaining);
  }

  return result.join('\r\n ');
}

/**
 * Build location string from CalendarLocation
 */
function buildLocationString(location: CalendarLocation): string {
  const parts: string[] = [];

  if (location.type === 'physical' || location.type === 'hybrid') {
    if (location.room) parts.push(location.room);
    if (location.address) parts.push(location.address);
  }

  if (location.type === 'virtual' || location.type === 'hybrid') {
    if (location.videoConferenceUrl) {
      parts.push(`Video: ${location.videoConferenceUrl}`);
    }
    if (location.dialInNumber) {
      let dialIn = `Dial-in: ${location.dialInNumber}`;
      if (location.dialInPin) {
        dialIn += ` PIN: ${location.dialInPin}`;
      }
      parts.push(dialIn);
    }
  }

  return parts.join(' | ');
}

/**
 * Build conference data for Apple/Google Calendar integration
 */
function buildConferenceData(location: CalendarLocation): string[] {
  const lines: string[] = [];

  if (location.videoConferenceUrl) {
    // X-GOOGLE-CONFERENCE for Google Calendar
    lines.push(`X-GOOGLE-CONFERENCE:${location.videoConferenceUrl}`);

    // X-APPLE-TRAVEL-ADVISORY-BEHAVIOR for Apple Calendar
    lines.push('X-APPLE-TRAVEL-ADVISORY-BEHAVIOR:AUTOMATIC');

    // Microsoft Teams / Zoom specific handling
    if (location.videoConferencePlatform === 'teams') {
      lines.push('X-MICROSOFT-ONLINEMEETINGJOINURL:' + location.videoConferenceUrl);
    }
  }

  return lines;
}

// ============================================================================
// ICAL GENERATION
// ============================================================================

/**
 * Generate iCal VTIMEZONE component for common timezones
 */
function generateVTimezone(timezone: string): string {
  // Simplified timezone handling - major timezones
  // In production, consider using a full VTIMEZONE database

  const timezones: Record<string, { standard: string; daylight?: string }> = {
    'Europe/Stockholm': {
      standard: `BEGIN:STANDARD
DTSTART:19701025T030000
RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU
TZOFFSETFROM:+0200
TZOFFSETTO:+0100
TZNAME:CET
END:STANDARD`,
      daylight: `BEGIN:DAYLIGHT
DTSTART:19700329T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU
TZOFFSETFROM:+0100
TZOFFSETTO:+0200
TZNAME:CEST
END:DAYLIGHT`,
    },
    'Europe/London': {
      standard: `BEGIN:STANDARD
DTSTART:19701025T020000
RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU
TZOFFSETFROM:+0100
TZOFFSETTO:+0000
TZNAME:GMT
END:STANDARD`,
      daylight: `BEGIN:DAYLIGHT
DTSTART:19700329T010000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU
TZOFFSETFROM:+0000
TZOFFSETTO:+0100
TZNAME:BST
END:DAYLIGHT`,
    },
    'America/New_York': {
      standard: `BEGIN:STANDARD
DTSTART:19701101T020000
RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU
TZOFFSETFROM:-0400
TZOFFSETTO:-0500
TZNAME:EST
END:STANDARD`,
      daylight: `BEGIN:DAYLIGHT
DTSTART:19700308T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU
TZOFFSETFROM:-0500
TZOFFSETTO:-0400
TZNAME:EDT
END:DAYLIGHT`,
    },
    'America/Los_Angeles': {
      standard: `BEGIN:STANDARD
DTSTART:19701101T020000
RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU
TZOFFSETFROM:-0700
TZOFFSETTO:-0800
TZNAME:PST
END:STANDARD`,
      daylight: `BEGIN:DAYLIGHT
DTSTART:19700308T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU
TZOFFSETFROM:-0800
TZOFFSETTO:-0700
TZNAME:PDT
END:DAYLIGHT`,
    },
    'UTC': {
      standard: `BEGIN:STANDARD
DTSTART:19700101T000000
TZOFFSETFROM:+0000
TZOFFSETTO:+0000
TZNAME:UTC
END:STANDARD`,
    },
  };

  const tz = timezones[timezone] || timezones['UTC'];

  let vtimezone = `BEGIN:VTIMEZONE
TZID:${timezone}
`;
  vtimezone += tz.standard + '\r\n';
  if (tz.daylight) {
    vtimezone += tz.daylight + '\r\n';
  }
  vtimezone += 'END:VTIMEZONE';

  return vtimezone;
}

/**
 * Generate VALARM component for reminders
 */
function generateVAlarm(alarm: CalendarAlarm): string {
  const lines: string[] = [
    'BEGIN:VALARM',
    `ACTION:${alarm.action}`,
    `TRIGGER:-PT${alarm.triggerMinutesBefore}M`,
  ];

  if (alarm.description) {
    lines.push(`DESCRIPTION:${escapeICalText(alarm.description)}`);
  } else {
    lines.push('DESCRIPTION:Meeting reminder');
  }

  lines.push('END:VALARM');

  return lines.join('\r\n');
}

/**
 * Generate a complete iCal calendar event
 */
export function generateICalEvent(
  event: CalendarEventData,
  options: CalendarExportOptions = {}
): string {
  const {
    method = 'REQUEST',
    prodId = '-//GovernanceOS//Board Governance Platform//EN',
  } = options;

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${prodId}`,
    'CALSCALE:GREGORIAN',
    `METHOD:${method}`,
  ];

  // Add timezone information
  lines.push(generateVTimezone(event.timezone));

  // Start VEVENT
  lines.push('BEGIN:VEVENT');

  // Core event properties
  lines.push(`UID:${event.uid}`);
  lines.push(`DTSTAMP:${formatDateToICalUTC(new Date())}`);
  lines.push(`DTSTART;${formatDateWithTimezone(event.startTime, event.timezone)}`);
  lines.push(`DTEND;${formatDateWithTimezone(event.endTime, event.timezone)}`);
  lines.push(foldLine(`SUMMARY:${escapeICalText(event.title)}`));

  // Optional properties
  if (event.description) {
    lines.push(foldLine(`DESCRIPTION:${escapeICalText(event.description)}`));
  }

  // Location
  const locationString = buildLocationString(event.location);
  if (locationString) {
    lines.push(foldLine(`LOCATION:${escapeICalText(locationString)}`));
  }

  // Conference data for video meetings
  if (event.location.videoConferenceUrl) {
    lines.push(...buildConferenceData(event.location));
  }

  // URL
  if (event.url) {
    lines.push(`URL:${event.url}`);
  }

  // Organizer
  if (event.organizer.name) {
    lines.push(`ORGANIZER;CN=${escapeICalText(event.organizer.name)}:mailto:${event.organizer.email}`);
  } else {
    lines.push(`ORGANIZER:mailto:${event.organizer.email}`);
  }

  // Attendees
  if (event.attendees && event.attendees.length > 0) {
    for (const attendee of event.attendees) {
      const parts: string[] = ['ATTENDEE'];

      if (attendee.name) {
        parts.push(`CN=${escapeICalText(attendee.name)}`);
      }
      if (attendee.role) {
        parts.push(`ROLE=${attendee.role}`);
      }
      if (attendee.partstat) {
        parts.push(`PARTSTAT=${attendee.partstat}`);
      }
      if (attendee.rsvp !== undefined) {
        parts.push(`RSVP=${attendee.rsvp ? 'TRUE' : 'FALSE'}`);
      }

      const attendeeLine = parts.join(';') + `:mailto:${attendee.email}`;
      lines.push(foldLine(attendeeLine));
    }
  }

  // Status
  if (event.status) {
    lines.push(`STATUS:${event.status}`);
  }

  // Sequence (for updates)
  if (event.sequence !== undefined) {
    lines.push(`SEQUENCE:${event.sequence}`);
  }

  // Priority
  if (event.priority !== undefined) {
    lines.push(`PRIORITY:${event.priority}`);
  }

  // Categories
  if (event.categories && event.categories.length > 0) {
    lines.push(`CATEGORIES:${event.categories.map(c => escapeICalText(c)).join(',')}`);
  }

  // Alarms
  if (event.alarms && event.alarms.length > 0) {
    for (const alarm of event.alarms) {
      lines.push(generateVAlarm(alarm));
    }
  } else {
    // Default alarms: 1 day and 1 hour before
    lines.push(generateVAlarm({ action: 'DISPLAY', triggerMinutesBefore: 1440 })); // 24 hours
    lines.push(generateVAlarm({ action: 'DISPLAY', triggerMinutesBefore: 60 }));   // 1 hour
  }

  // Transparency (for calendar free/busy)
  lines.push('TRANSP:OPAQUE');

  // End VEVENT
  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');

  return lines.join('\r\n');
}

/**
 * Generate iCal for meeting cancellation
 */
export function generateICalCancellation(
  event: Pick<CalendarEventData, 'uid' | 'title' | 'startTime' | 'endTime' | 'timezone' | 'organizer'>,
  sequence: number = 1
): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    '-//GovernanceOS//Board Governance Platform//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:CANCEL',
    generateVTimezone(event.timezone),
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${formatDateToICalUTC(new Date())}`,
    `DTSTART;${formatDateWithTimezone(event.startTime, event.timezone)}`,
    `DTEND;${formatDateWithTimezone(event.endTime, event.timezone)}`,
    foldLine(`SUMMARY:${escapeICalText(event.title)}`),
    `ORGANIZER:mailto:${event.organizer.email}`,
    'STATUS:CANCELLED',
    `SEQUENCE:${sequence}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return lines.join('\r\n');
}

// ============================================================================
// HIGH-LEVEL FUNCTIONS
// ============================================================================

export interface MeetingCalendarData {
  meetingId: string;
  tenantId: string;
  title: string;
  description?: string;
  meetingType: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  timezone: string;
  location: CalendarLocation;
  organizer: {
    email: string;
    name?: string;
  };
  attendees: Array<{
    email: string;
    name?: string;
    role?: string;
    hasVotingRights?: boolean;
  }>;
  meetingUrl: string;
  sequence?: number;
}

/**
 * Generate iCal for a board meeting
 */
export function generateMeetingICalEvent(data: MeetingCalendarData): string {
  // Build description with meeting details
  const descriptionParts: string[] = [];

  if (data.description) {
    descriptionParts.push(data.description);
    descriptionParts.push('');
  }

  descriptionParts.push(`Meeting Type: ${data.meetingType.replace('_', ' ')}`);
  descriptionParts.push(`View meeting details: ${data.meetingUrl}`);

  if (data.location.videoConferenceUrl) {
    descriptionParts.push('');
    descriptionParts.push(`Join video call: ${data.location.videoConferenceUrl}`);
  }

  if (data.location.dialInNumber) {
    descriptionParts.push(`Dial-in: ${data.location.dialInNumber}`);
    if (data.location.dialInPin) {
      descriptionParts.push(`PIN: ${data.location.dialInPin}`);
    }
  }

  // Map attendees to calendar attendees
  const calendarAttendees: CalendarAttendee[] = data.attendees.map(a => ({
    email: a.email,
    name: a.name,
    role: a.role === 'chair' ? 'CHAIR' : 'REQ-PARTICIPANT',
    rsvp: true,
    partstat: 'NEEDS-ACTION',
  }));

  return generateICalEvent(
    {
      uid: `meeting-${data.meetingId}@governanceos.app`,
      title: data.title,
      description: descriptionParts.join('\n'),
      startTime: data.scheduledStart,
      endTime: data.scheduledEnd,
      timezone: data.timezone,
      location: data.location,
      organizer: data.organizer,
      attendees: calendarAttendees,
      url: data.meetingUrl,
      categories: ['Board Meeting', data.meetingType],
      sequence: data.sequence || 0,
      status: 'CONFIRMED',
      priority: 1,
      alarms: [
        { action: 'DISPLAY', triggerMinutesBefore: 1440, description: `Reminder: ${data.title} tomorrow` },
        { action: 'DISPLAY', triggerMinutesBefore: 60, description: `Reminder: ${data.title} in 1 hour` },
        { action: 'DISPLAY', triggerMinutesBefore: 15, description: `Reminder: ${data.title} in 15 minutes` },
      ],
    },
    { method: 'REQUEST' }
  );
}

/**
 * Generate iCal for meeting update
 */
export function generateMeetingUpdateICalEvent(
  data: MeetingCalendarData,
  sequence: number
): string {
  return generateMeetingICalEvent({
    ...data,
    sequence,
  });
}

/**
 * Generate iCal for meeting cancellation
 */
export function generateMeetingCancellationICalEvent(
  data: Pick<MeetingCalendarData, 'meetingId' | 'title' | 'scheduledStart' | 'scheduledEnd' | 'timezone' | 'organizer'>,
  sequence: number
): string {
  return generateICalCancellation(
    {
      uid: `meeting-${data.meetingId}@governanceos.app`,
      title: data.title,
      startTime: data.scheduledStart,
      endTime: data.scheduledEnd,
      timezone: data.timezone,
      organizer: data.organizer,
    },
    sequence
  );
}

/**
 * Generate unique calendar event ID for a meeting
 */
export function generateMeetingCalendarUid(meetingId: string): string {
  return `meeting-${meetingId}@governanceos.app`;
}

/**
 * Parse iCal file to extract event data (basic parser)
 */
export function parseICalEvent(icalContent: string): Partial<CalendarEventData> | null {
  try {
    const lines = icalContent.split(/\r?\n/);
    const event: Partial<CalendarEventData> = {};

    let currentLine = '';

    for (const line of lines) {
      // Handle line folding
      if (line.startsWith(' ') || line.startsWith('\t')) {
        currentLine += line.substring(1);
        continue;
      }

      // Process previous line
      if (currentLine) {
        const colonIndex = currentLine.indexOf(':');
        if (colonIndex > 0) {
          const key = currentLine.substring(0, colonIndex).split(';')[0];
          const value = currentLine.substring(colonIndex + 1);

          switch (key) {
            case 'UID':
              event.uid = value;
              break;
            case 'SUMMARY':
              event.title = value.replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';');
              break;
            case 'DESCRIPTION':
              event.description = value.replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';');
              break;
            case 'LOCATION':
              event.location = {
                type: 'physical',
                address: value.replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';'),
              };
              break;
            case 'STATUS':
              event.status = value as CalendarEventData['status'];
              break;
            case 'SEQUENCE':
              event.sequence = parseInt(value, 10);
              break;
          }
        }
      }

      currentLine = line;
    }

    return event.uid ? event : null;
  } catch {
    return null;
  }
}

/**
 * Create a downloadable .ics file URL (data URL)
 */
export function createICalDataUrl(icalContent: string): string {
  const base64Content = Buffer.from(icalContent).toString('base64');
  return `data:text/calendar;base64,${base64Content}`;
}

/**
 * Create a Google Calendar add event URL
 */
export function createGoogleCalendarUrl(event: {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
}): string {
  const params = new URLSearchParams();
  params.set('action', 'TEMPLATE');
  params.set('text', event.title);

  if (event.description) {
    params.set('details', event.description);
  }

  if (event.location) {
    params.set('location', event.location);
  }

  // Format dates for Google Calendar (YYYYMMDDTHHMMSSZ)
  const formatGoogleDate = (date: Date) =>
    date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  params.set('dates', `${formatGoogleDate(event.startTime)}/${formatGoogleDate(event.endTime)}`);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Create an Outlook Calendar add event URL
 */
export function createOutlookCalendarUrl(event: {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
}): string {
  const params = new URLSearchParams();
  params.set('path', '/calendar/action/compose');
  params.set('rru', 'addevent');
  params.set('subject', event.title);

  if (event.description) {
    params.set('body', event.description);
  }

  if (event.location) {
    params.set('location', event.location);
  }

  params.set('startdt', event.startTime.toISOString());
  params.set('enddt', event.endTime.toISOString());

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}
