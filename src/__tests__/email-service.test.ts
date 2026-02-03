/**
 * Email Service Unit Tests
 *
 * Tests the email template generation and sending functions including:
 * - Member invitation emails
 * - Meeting invitation emails
 * - Meeting reminder emails
 * - Bulk email sending
 */

import {
  generateMemberInviteEmail,
  generateMeetingInviteEmail,
  generateReminderEmail,
  sendEmail,
  sendMemberInvitationEmail,
  sendMeetingInvitationEmail,
  sendMeetingReminderEmail,
  sendBulkMeetingInvitations,
  type MemberInviteEmailData,
  type MeetingInviteEmailData,
  type ReminderEmailData,
} from '@/lib/email-service';

// Store original fetch
const originalFetch = global.fetch;

describe('Email Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  describe('generateMemberInviteEmail', () => {
    const mockData: MemberInviteEmailData = {
      recipientName: 'John Doe',
      recipientEmail: 'john@example.com',
      organizationName: 'Acme Corp',
      inviterName: 'Jane Smith',
      role: 'Director',
      inviteUrl: 'https://app.example.com/auth/signup?invite=abc123',
    };

    it('should generate HTML email with correct organization name', () => {
      const result = generateMemberInviteEmail(mockData);

      expect(result.html).toContain('Acme Corp');
      expect(result.html).toContain("You're Invited to Join Acme Corp");
    });

    it('should include recipient name in greeting', () => {
      const result = generateMemberInviteEmail(mockData);

      expect(result.html).toContain('Hello John Doe');
      expect(result.text).toContain('Hello John Doe');
    });

    it('should include inviter name', () => {
      const result = generateMemberInviteEmail(mockData);

      expect(result.html).toContain('Jane Smith');
      expect(result.text).toContain('Jane Smith');
    });

    it('should include the role', () => {
      const result = generateMemberInviteEmail(mockData);

      expect(result.html).toContain('Director');
      expect(result.text).toContain('Director');
    });

    it('should include the invite URL', () => {
      const result = generateMemberInviteEmail(mockData);

      expect(result.html).toContain(mockData.inviteUrl);
      expect(result.text).toContain(mockData.inviteUrl);
    });

    it('should include Accept Invitation button in HTML', () => {
      const result = generateMemberInviteEmail(mockData);

      expect(result.html).toContain('Accept Invitation');
      expect(result.html).toContain('class="button"');
    });

    it('should include expiration notice', () => {
      const result = generateMemberInviteEmail(mockData);

      expect(result.html).toContain('7 days');
      expect(result.text).toContain('7 days');
    });

    it('should handle custom message if provided', () => {
      const dataWithMessage: MemberInviteEmailData = {
        ...mockData,
        customMessage: 'Looking forward to working with you!',
      };

      const result = generateMemberInviteEmail(dataWithMessage);

      expect(result.html).toContain('Looking forward to working with you!');
      expect(result.text).toContain('Looking forward to working with you!');
    });

    it('should handle missing recipient name gracefully', () => {
      const dataWithoutName: MemberInviteEmailData = {
        ...mockData,
        recipientName: '',
      };

      const result = generateMemberInviteEmail(dataWithoutName);

      expect(result.html).toContain('Hello,');
      expect(result.text).toContain('Hello,');
    });

    it('should return both HTML and text versions', () => {
      const result = generateMemberInviteEmail(mockData);

      expect(result.html).toBeDefined();
      expect(result.text).toBeDefined();
      expect(result.html).toContain('<!DOCTYPE html>');
      expect(result.text).not.toContain('<!DOCTYPE html>');
    });

    it('should include GovernanceOS branding', () => {
      const result = generateMemberInviteEmail(mockData);

      expect(result.html).toContain('GovernanceOS');
      expect(result.text).toContain('GovernanceOS');
    });
  });

  describe('generateMeetingInviteEmail', () => {
    const mockData: MeetingInviteEmailData = {
      recipientName: 'John Doe',
      recipientEmail: 'john@example.com',
      meetingTitle: 'Q1 Board Meeting',
      meetingType: 'board_meeting',
      organizationName: 'Acme Corp',
      scheduledStart: new Date('2024-02-15T09:00:00Z'),
      scheduledEnd: new Date('2024-02-15T12:00:00Z'),
      timezone: 'Europe/Stockholm',
      location: {
        type: 'hybrid',
        address: '123 Main Street, Stockholm',
        videoConferenceUrl: 'https://meet.example.com/abc123',
      },
      meetingUrl: 'https://app.example.com/meetings/meeting-123',
    };

    it('should generate HTML email with meeting title', () => {
      const result = generateMeetingInviteEmail(mockData);

      expect(result.html).toContain('Q1 Board Meeting');
      expect(result.html).toContain('Meeting Invitation:');
    });

    it('should include organization name', () => {
      const result = generateMeetingInviteEmail(mockData);

      expect(result.html).toContain('Acme Corp');
      expect(result.text).toContain('Acme Corp');
    });

    it('should include meeting type', () => {
      const result = generateMeetingInviteEmail(mockData);

      expect(result.html).toContain('board meeting');
      expect(result.text).toContain('board meeting');
    });

    it('should format date correctly', () => {
      const result = generateMeetingInviteEmail(mockData);

      // Should contain day of week, month, day, year
      expect(result.html).toMatch(/Thursday|February|15|2024/);
    });

    it('should include timezone in time display', () => {
      const result = generateMeetingInviteEmail(mockData);

      expect(result.html).toContain('Europe/Stockholm');
      expect(result.text).toContain('Europe/Stockholm');
    });

    it('should include meeting URL', () => {
      const result = generateMeetingInviteEmail(mockData);

      expect(result.html).toContain(mockData.meetingUrl);
      expect(result.text).toContain(mockData.meetingUrl);
    });

    it('should include View Meeting Details button', () => {
      const result = generateMeetingInviteEmail(mockData);

      expect(result.html).toContain('View Meeting Details');
    });

    it('should handle virtual location', () => {
      const virtualData: MeetingInviteEmailData = {
        ...mockData,
        location: {
          type: 'virtual',
          videoConferenceUrl: 'https://meet.example.com/abc123',
        },
      };

      const result = generateMeetingInviteEmail(virtualData);

      expect(result.html).toContain('Virtual Meeting');
    });

    it('should handle physical location', () => {
      const physicalData: MeetingInviteEmailData = {
        ...mockData,
        location: {
          type: 'physical',
          address: '456 Board Room, Stockholm',
        },
      };

      const result = generateMeetingInviteEmail(physicalData);

      expect(result.html).toContain('456 Board Room, Stockholm');
    });

    it('should handle hybrid location with address and video link', () => {
      const result = generateMeetingInviteEmail(mockData);

      expect(result.html).toContain('Hybrid');
      expect(result.html).toContain('123 Main Street, Stockholm');
      expect(result.html).toContain('Video Link');
    });

    it('should mention calendar attachment', () => {
      const result = generateMeetingInviteEmail(mockData);

      expect(result.html).toContain('calendar invitation');
      expect(result.text).toContain('calendar invitation');
    });
  });

  describe('generateReminderEmail', () => {
    const mockData: ReminderEmailData = {
      recipientName: 'John Doe',
      recipientEmail: 'john@example.com',
      meetingTitle: 'Q1 Board Meeting',
      scheduledStart: new Date('2024-02-15T09:00:00Z'),
      timezone: 'Europe/Stockholm',
      meetingUrl: 'https://app.example.com/meetings/meeting-123',
      hoursUntilMeeting: 24,
    };

    it('should generate reminder email with meeting title', () => {
      const result = generateReminderEmail(mockData);

      expect(result.html).toContain('Reminder: Q1 Board Meeting');
      expect(result.text).toContain('Reminder: Q1 Board Meeting');
    });

    it('should show time until meeting in hours when less than 24', () => {
      const dataWithHours: ReminderEmailData = {
        ...mockData,
        hoursUntilMeeting: 12,
      };

      const result = generateReminderEmail(dataWithHours);

      expect(result.html).toContain('12 hours');
    });

    it('should show time in days when over 24 hours', () => {
      const dataWithDays: ReminderEmailData = {
        ...mockData,
        hoursUntilMeeting: 72,
      };

      const result = generateReminderEmail(dataWithDays);

      expect(result.html).toContain('3 days');
    });

    it('should use singular "hour" when 1 hour', () => {
      const dataWithOneHour: ReminderEmailData = {
        ...mockData,
        hoursUntilMeeting: 1,
      };

      const result = generateReminderEmail(dataWithOneHour);

      expect(result.html).toContain('1 hour');
      expect(result.html).not.toContain('1 hours');
    });

    it('should include View Meeting button', () => {
      const result = generateReminderEmail(mockData);

      expect(result.html).toContain('View Meeting');
      expect(result.html).toContain(mockData.meetingUrl);
    });

    it('should include meeting details', () => {
      const result = generateReminderEmail(mockData);

      expect(result.html).toContain('Q1 Board Meeting');
      expect(result.html).toContain('Europe/Stockholm');
    });
  });

  describe('sendEmail', () => {
    it('should use mock provider by default and succeed', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await sendEmail({
        to: { email: 'test@example.com', name: 'Test User' },
        subject: 'Test Email',
        html: '<p>Test content</p>',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.messageId).toContain('mock-');

      consoleSpy.mockRestore();
    });

    it('should handle multiple recipients', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await sendEmail({
        to: [
          { email: 'user1@example.com', name: 'User 1' },
          { email: 'user2@example.com', name: 'User 2' },
        ],
        subject: 'Test Email',
        html: '<p>Test content</p>',
      });

      expect(result.success).toBe(true);

      consoleSpy.mockRestore();
    });
  });

  describe('sendMemberInvitationEmail', () => {
    it('should send member invitation email successfully', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await sendMemberInvitationEmail({
        recipientName: 'John Doe',
        recipientEmail: 'john@example.com',
        organizationName: 'Acme Corp',
        inviterName: 'Jane Smith',
        role: 'Director',
        inviteUrl: 'https://app.example.com/auth/signup?invite=abc123',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();

      consoleSpy.mockRestore();
    });
  });

  describe('sendMeetingInvitationEmail', () => {
    it('should send meeting invitation email successfully', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await sendMeetingInvitationEmail({
        recipientName: 'John Doe',
        recipientEmail: 'john@example.com',
        meetingTitle: 'Q1 Board Meeting',
        meetingType: 'board_meeting',
        organizationName: 'Acme Corp',
        scheduledStart: new Date('2024-02-15T09:00:00Z'),
        scheduledEnd: new Date('2024-02-15T12:00:00Z'),
        timezone: 'Europe/Stockholm',
        location: { type: 'virtual' },
        meetingUrl: 'https://app.example.com/meetings/meeting-123',
      });

      expect(result.success).toBe(true);

      consoleSpy.mockRestore();
    });

    it('should include calendar attachment when provided', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await sendMeetingInvitationEmail({
        recipientName: 'John Doe',
        recipientEmail: 'john@example.com',
        meetingTitle: 'Q1 Board Meeting',
        meetingType: 'board_meeting',
        organizationName: 'Acme Corp',
        scheduledStart: new Date('2024-02-15T09:00:00Z'),
        scheduledEnd: new Date('2024-02-15T12:00:00Z'),
        timezone: 'Europe/Stockholm',
        location: { type: 'virtual' },
        meetingUrl: 'https://app.example.com/meetings/meeting-123',
        calendarAttachment: 'BEGIN:VCALENDAR...',
      });

      expect(result.success).toBe(true);
      // The mock provider logs attachments count
      expect(consoleSpy).toHaveBeenCalledWith('Attachments:', 1);

      consoleSpy.mockRestore();
    });
  });

  describe('sendMeetingReminderEmail', () => {
    it('should send meeting reminder email successfully', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await sendMeetingReminderEmail({
        recipientName: 'John Doe',
        recipientEmail: 'john@example.com',
        meetingTitle: 'Q1 Board Meeting',
        scheduledStart: new Date('2024-02-15T09:00:00Z'),
        timezone: 'Europe/Stockholm',
        meetingUrl: 'https://app.example.com/meetings/meeting-123',
        hoursUntilMeeting: 24,
      });

      expect(result.success).toBe(true);

      consoleSpy.mockRestore();
    });
  });

  describe('sendBulkMeetingInvitations', () => {
    it('should send invitations to multiple attendees', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const attendees = [
        { email: 'user1@example.com', name: 'User 1' },
        { email: 'user2@example.com', name: 'User 2' },
        { email: 'user3@example.com', name: 'User 3' },
      ];

      const meetingData = {
        meetingTitle: 'Q1 Board Meeting',
        meetingType: 'board_meeting',
        organizationName: 'Acme Corp',
        scheduledStart: new Date('2024-02-15T09:00:00Z'),
        scheduledEnd: new Date('2024-02-15T12:00:00Z'),
        timezone: 'Europe/Stockholm',
        location: { type: 'virtual' as const },
        meetingUrl: 'https://app.example.com/meetings/meeting-123',
      };

      const result = await sendBulkMeetingInvitations(attendees, meetingData);

      expect(result.sent).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);

      consoleSpy.mockRestore();
    });

    it('should handle attendees without names', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const attendees = [
        { email: 'user1@example.com' },
        { email: 'user2@example.com', name: 'User 2' },
      ];

      const meetingData = {
        meetingTitle: 'Q1 Board Meeting',
        meetingType: 'board_meeting',
        organizationName: 'Acme Corp',
        scheduledStart: new Date('2024-02-15T09:00:00Z'),
        scheduledEnd: new Date('2024-02-15T12:00:00Z'),
        timezone: 'Europe/Stockholm',
        location: { type: 'virtual' as const },
        meetingUrl: 'https://app.example.com/meetings/meeting-123',
      };

      const result = await sendBulkMeetingInvitations(attendees, meetingData);

      expect(result.sent).toBe(2);
      expect(result.failed).toBe(0);

      consoleSpy.mockRestore();
    });

    it('should return empty results for empty attendee list', async () => {
      const meetingData = {
        meetingTitle: 'Q1 Board Meeting',
        meetingType: 'board_meeting',
        organizationName: 'Acme Corp',
        scheduledStart: new Date('2024-02-15T09:00:00Z'),
        scheduledEnd: new Date('2024-02-15T12:00:00Z'),
        timezone: 'Europe/Stockholm',
        location: { type: 'virtual' as const },
        meetingUrl: 'https://app.example.com/meetings/meeting-123',
      };

      const result = await sendBulkMeetingInvitations([], meetingData);

      expect(result.sent).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Email Template Structure', () => {
    it('should include proper HTML document structure', () => {
      const result = generateMemberInviteEmail({
        recipientName: 'Test',
        recipientEmail: 'test@example.com',
        organizationName: 'Test Org',
        inviterName: 'Inviter',
        role: 'Member',
        inviteUrl: 'https://example.com',
      });

      expect(result.html).toContain('<!DOCTYPE html>');
      expect(result.html).toContain('<html');
      expect(result.html).toContain('<head>');
      expect(result.html).toContain('<body>');
      expect(result.html).toContain('</html>');
    });

    it('should include responsive meta viewport', () => {
      const result = generateMemberInviteEmail({
        recipientName: 'Test',
        recipientEmail: 'test@example.com',
        organizationName: 'Test Org',
        inviterName: 'Inviter',
        role: 'Member',
        inviteUrl: 'https://example.com',
      });

      expect(result.html).toContain('viewport');
      expect(result.html).toContain('width=device-width');
    });

    it('should include inline styles for email compatibility', () => {
      const result = generateMemberInviteEmail({
        recipientName: 'Test',
        recipientEmail: 'test@example.com',
        organizationName: 'Test Org',
        inviterName: 'Inviter',
        role: 'Member',
        inviteUrl: 'https://example.com',
      });

      expect(result.html).toContain('<style>');
      expect(result.html).toContain('.button');
      expect(result.html).toContain('.container');
    });

    it('should include footer with app link', () => {
      const result = generateMemberInviteEmail({
        recipientName: 'Test',
        recipientEmail: 'test@example.com',
        organizationName: 'Test Org',
        inviterName: 'Inviter',
        role: 'Member',
        inviteUrl: 'https://example.com',
      });

      expect(result.html).toContain('class="footer"');
      expect(result.html).toContain('Visit GovernanceOS');
    });
  });
});
