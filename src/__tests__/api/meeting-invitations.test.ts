/**
 * Meeting Invitations API Tests
 *
 * Tests the meeting invitation functionality including:
 * - Getting invitation status
 * - Sending calendar invitations
 * - Updating/cancelling invitations
 * - RSVP handling
 */

import { NextRequest } from 'next/server';

// Mock Firebase before importing the route
jest.mock('@/lib/firebase', () => ({
  collections: {
    meeting: jest.fn((tenantId: string, meetingId: string) => ({
      path: `tenants/${tenantId}/meetings/${meetingId}`,
    })),
    tenant: jest.fn((tenantId: string) => ({
      path: `tenants/${tenantId}`,
    })),
  },
  Timestamp: {
    now: jest.fn(() => ({
      toDate: () => new Date('2024-01-15T10:00:00Z'),
      seconds: 1705312800,
      nanoseconds: 0,
    })),
  },
}));

// Mock email service
const mockSendBulkMeetingInvitations = jest.fn();
jest.mock('@/lib/email-service', () => ({
  sendBulkMeetingInvitations: (...args: unknown[]) => mockSendBulkMeetingInvitations(...args),
}));

// Mock calendar service
const mockGenerateMeetingICalEvent = jest.fn();
const mockGenerateMeetingUpdateICalEvent = jest.fn();
const mockGenerateMeetingCancellationICalEvent = jest.fn();

jest.mock('@/lib/calendar-service', () => ({
  generateMeetingICalEvent: (...args: unknown[]) => mockGenerateMeetingICalEvent(...args),
  generateMeetingUpdateICalEvent: (...args: unknown[]) => mockGenerateMeetingUpdateICalEvent(...args),
  generateMeetingCancellationICalEvent: (...args: unknown[]) => mockGenerateMeetingCancellationICalEvent(...args),
}));

// Mock Firestore operations
const mockGetDoc = jest.fn();
const mockUpdateDoc = jest.fn();

jest.mock('firebase/firestore', () => ({
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
}));

// Import route handlers after mocking
import { GET, POST, PATCH } from '@/app/api/meetings/[meetingId]/invitations/route';

describe('Meeting Invitations API', () => {
  const mockMeeting = {
    id: 'meeting-1',
    tenantId: 'tenant-1',
    title: 'Q1 Board Meeting',
    description: 'Quarterly review meeting',
    meetingType: 'ordinary',
    status: 'scheduled',
    scheduledStart: { toDate: () => new Date('2024-02-01T09:00:00Z') },
    scheduledEnd: { toDate: () => new Date('2024-02-01T12:00:00Z') },
    timezone: 'Europe/Stockholm',
    location: {
      type: 'hybrid',
      address: '123 Main St',
      videoConferenceUrl: 'https://meet.example.com/abc123',
    },
    attendees: [
      {
        memberId: 'member-1',
        userId: 'user-1',
        displayName: 'John Doe',
        role: 'chair',
        guestEmail: 'john@example.com',
        invitedAt: { toDate: () => new Date('2024-01-10T10:00:00Z') },
        response: 'accepted',
        respondedAt: { toDate: () => new Date('2024-01-11T10:00:00Z') },
        hasVotingRights: true,
      },
      {
        memberId: 'member-2',
        userId: 'user-2',
        displayName: 'Jane Smith',
        role: 'secretary',
        guestEmail: 'jane@example.com',
        invitedAt: { toDate: () => new Date('2024-01-10T10:00:00Z') },
        response: 'pending',
        hasVotingRights: true,
      },
      {
        memberId: 'member-3',
        userId: 'user-3',
        displayName: 'Bob Wilson',
        role: 'director',
        guestEmail: 'bob@example.com',
        invitedAt: { toDate: () => new Date('2024-01-10T10:00:00Z') },
        response: 'declined',
        respondedAt: { toDate: () => new Date('2024-01-12T10:00:00Z') },
        hasVotingRights: true,
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      id: mockMeeting.id,
      data: () => mockMeeting,
    });
    mockUpdateDoc.mockResolvedValue(undefined);
    mockSendBulkMeetingInvitations.mockResolvedValue({ sent: 3, failed: 0, errors: [] });
    mockGenerateMeetingICalEvent.mockReturnValue('BEGIN:VCALENDAR...');
    mockGenerateMeetingUpdateICalEvent.mockReturnValue('BEGIN:VCALENDAR...');
    mockGenerateMeetingCancellationICalEvent.mockReturnValue('BEGIN:VCALENDAR...');
  });

  const createParams = async (meetingId: string) => ({
    params: Promise.resolve({ meetingId }),
  });

  describe('GET /api/meetings/[meetingId]/invitations', () => {
    it('should return 400 if tenantId or meetingId is missing', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/meetings/meeting-1/invitations'
      );

      const response = await GET(request, await createParams('meeting-1'));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('tenantId and meetingId are required');
    });

    it('should return 404 if meeting not found', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => false,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/meetings/meeting-1/invitations?tenantId=tenant-1'
      );

      const response = await GET(request, await createParams('meeting-1'));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Meeting not found');
    });

    it('should return invitation status for all attendees', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/meetings/meeting-1/invitations?tenantId=tenant-1'
      );

      const response = await GET(request, await createParams('meeting-1'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.meetingId).toBe('meeting-1');
      expect(data.status).toBe('scheduled');
      expect(data.invitations).toHaveLength(3);
      expect(data.totalInvited).toBe(3);
    });

    it('should return response counts', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/meetings/meeting-1/invitations?tenantId=tenant-1'
      );

      const response = await GET(request, await createParams('meeting-1'));
      const data = await response.json();

      expect(data.responses.accepted).toBe(1);
      expect(data.responses.declined).toBe(1);
      expect(data.responses.tentative).toBe(0);
      expect(data.responses.pending).toBe(1);
    });

    it('should include attendee details in invitations', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/meetings/meeting-1/invitations?tenantId=tenant-1'
      );

      const response = await GET(request, await createParams('meeting-1'));
      const data = await response.json();

      const invitation = data.invitations.find((i: { memberId: string }) => i.memberId === 'member-1');
      expect(invitation.displayName).toBe('John Doe');
      expect(invitation.email).toBe('john@example.com');
      expect(invitation.response).toBe('accepted');
    });

    it('should handle Firestore errors gracefully', async () => {
      mockGetDoc.mockRejectedValueOnce(new Error('Firestore error'));

      const request = new NextRequest(
        'http://localhost:3000/api/meetings/meeting-1/invitations?tenantId=tenant-1'
      );

      const response = await GET(request, await createParams('meeting-1'));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to get invitation status');
    });
  });

  describe('POST /api/meetings/[meetingId]/invitations (Send Invitations)', () => {
    it('should return 400 if required fields are missing', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/meetings/meeting-1/invitations',
        {
          method: 'POST',
          body: JSON.stringify({}),
        }
      );

      const response = await POST(request, await createParams('meeting-1'));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('tenantId and meetingId are required');
    });

    it('should return 404 if meeting not found', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => false,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/meetings/meeting-1/invitations',
        {
          method: 'POST',
          body: JSON.stringify({
            tenantId: 'tenant-1',
          }),
        }
      );

      const response = await POST(request, await createParams('meeting-1'));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Meeting not found');
    });

    it('should send invitations to all attendees', async () => {
      // First call for meeting, second for tenant
      mockGetDoc
        .mockResolvedValueOnce({
          exists: () => true,
          id: mockMeeting.id,
          data: () => mockMeeting,
        })
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({ name: 'Test Organization' }),
        });

      const request = new NextRequest(
        'http://localhost:3000/api/meetings/meeting-1/invitations',
        {
          method: 'POST',
          body: JSON.stringify({
            tenantId: 'tenant-1',
            action: 'send',
            organizerEmail: 'organizer@example.com',
            organizerName: 'Meeting Organizer',
          }),
        }
      );

      const response = await POST(request, await createParams('meeting-1'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.action).toBe('send');
      expect(data.invitationsSent).toBe(3);
      expect(data.icalGenerated).toBe(true);
      expect(mockGenerateMeetingICalEvent).toHaveBeenCalled();
      expect(mockSendBulkMeetingInvitations).toHaveBeenCalled();
    });

    it('should send invitations to specific attendees only', async () => {
      mockGetDoc
        .mockResolvedValueOnce({
          exists: () => true,
          id: mockMeeting.id,
          data: () => mockMeeting,
        })
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({ name: 'Test Organization' }),
        });

      mockSendBulkMeetingInvitations.mockResolvedValueOnce({ sent: 1, failed: 0, errors: [] });

      const request = new NextRequest(
        'http://localhost:3000/api/meetings/meeting-1/invitations',
        {
          method: 'POST',
          body: JSON.stringify({
            tenantId: 'tenant-1',
            attendeeIds: ['member-1'],
          }),
        }
      );

      const response = await POST(request, await createParams('meeting-1'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.invitationsSent).toBe(1);
    });

    it('should send update invitations', async () => {
      mockGetDoc
        .mockResolvedValueOnce({
          exists: () => true,
          id: mockMeeting.id,
          data: () => mockMeeting,
        })
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({ name: 'Test Organization' }),
        });

      const request = new NextRequest(
        'http://localhost:3000/api/meetings/meeting-1/invitations',
        {
          method: 'POST',
          body: JSON.stringify({
            tenantId: 'tenant-1',
            action: 'update',
          }),
        }
      );

      const response = await POST(request, await createParams('meeting-1'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.action).toBe('update');
      expect(mockGenerateMeetingUpdateICalEvent).toHaveBeenCalled();
    });

    it('should send cancellation invitations', async () => {
      mockGetDoc
        .mockResolvedValueOnce({
          exists: () => true,
          id: mockMeeting.id,
          data: () => mockMeeting,
        })
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({ name: 'Test Organization' }),
        });

      const request = new NextRequest(
        'http://localhost:3000/api/meetings/meeting-1/invitations',
        {
          method: 'POST',
          body: JSON.stringify({
            tenantId: 'tenant-1',
            action: 'cancel',
          }),
        }
      );

      const response = await POST(request, await createParams('meeting-1'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.action).toBe('cancel');
      expect(mockGenerateMeetingCancellationICalEvent).toHaveBeenCalled();
    });

    it('should update attendee invitation timestamps', async () => {
      mockGetDoc
        .mockResolvedValueOnce({
          exists: () => true,
          id: mockMeeting.id,
          data: () => mockMeeting,
        })
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({ name: 'Test Organization' }),
        });

      const request = new NextRequest(
        'http://localhost:3000/api/meetings/meeting-1/invitations',
        {
          method: 'POST',
          body: JSON.stringify({
            tenantId: 'tenant-1',
          }),
        }
      );

      await POST(request, await createParams('meeting-1'));

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          attendees: expect.any(Array),
          updatedAt: expect.anything(),
        })
      );
    });

    it('should handle email sending failures', async () => {
      mockGetDoc
        .mockResolvedValueOnce({
          exists: () => true,
          id: mockMeeting.id,
          data: () => mockMeeting,
        })
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({ name: 'Test Organization' }),
        });

      mockSendBulkMeetingInvitations.mockResolvedValueOnce({
        sent: 2,
        failed: 1,
        errors: ['bob@example.com: Email service error'],
      });

      const request = new NextRequest(
        'http://localhost:3000/api/meetings/meeting-1/invitations',
        {
          method: 'POST',
          body: JSON.stringify({
            tenantId: 'tenant-1',
          }),
        }
      );

      const response = await POST(request, await createParams('meeting-1'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.invitationsSent).toBe(2);
      expect(data.invitationsFailed).toBe(1);
      expect(data.errors).toContain('bob@example.com: Email service error');
    });

    it('should handle Firestore errors gracefully', async () => {
      mockGetDoc.mockRejectedValueOnce(new Error('Firestore error'));

      const request = new NextRequest(
        'http://localhost:3000/api/meetings/meeting-1/invitations',
        {
          method: 'POST',
          body: JSON.stringify({
            tenantId: 'tenant-1',
          }),
        }
      );

      const response = await POST(request, await createParams('meeting-1'));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to send meeting invitations');
    });
  });

  describe('PATCH /api/meetings/[meetingId]/invitations (Update RSVP)', () => {
    it('should return 400 if required fields are missing', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/meetings/meeting-1/invitations',
        {
          method: 'PATCH',
          body: JSON.stringify({
            tenantId: 'tenant-1',
            // Missing memberId and response
          }),
        }
      );

      const response = await PATCH(request, await createParams('meeting-1'));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('tenantId, meetingId, memberId, and response are required');
    });

    it('should return 400 for invalid response values', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/meetings/meeting-1/invitations',
        {
          method: 'PATCH',
          body: JSON.stringify({
            tenantId: 'tenant-1',
            memberId: 'member-1',
            response: 'invalid_response',
          }),
        }
      );

      const response = await PATCH(request, await createParams('meeting-1'));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('response must be: accepted, declined, or tentative');
    });

    it('should return 404 if meeting not found', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => false,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/meetings/meeting-1/invitations',
        {
          method: 'PATCH',
          body: JSON.stringify({
            tenantId: 'tenant-1',
            memberId: 'member-1',
            response: 'accepted',
          }),
        }
      );

      const response = await PATCH(request, await createParams('meeting-1'));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Meeting not found');
    });

    it('should update RSVP to accepted', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/meetings/meeting-1/invitations',
        {
          method: 'PATCH',
          body: JSON.stringify({
            tenantId: 'tenant-1',
            memberId: 'member-2',
            response: 'accepted',
          }),
        }
      );

      const response = await PATCH(request, await createParams('meeting-1'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.meetingId).toBe('meeting-1');
      expect(data.memberId).toBe('member-2');
      expect(data.response).toBe('accepted');
      expect(data.respondedAt).toBeDefined();
    });

    it('should update RSVP to declined', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/meetings/meeting-1/invitations',
        {
          method: 'PATCH',
          body: JSON.stringify({
            tenantId: 'tenant-1',
            memberId: 'member-1',
            response: 'declined',
          }),
        }
      );

      const response = await PATCH(request, await createParams('meeting-1'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.response).toBe('declined');
    });

    it('should update RSVP to tentative', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/meetings/meeting-1/invitations',
        {
          method: 'PATCH',
          body: JSON.stringify({
            tenantId: 'tenant-1',
            memberId: 'member-1',
            response: 'tentative',
          }),
        }
      );

      const response = await PATCH(request, await createParams('meeting-1'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.response).toBe('tentative');
    });

    it('should update Firestore with correct attendee data', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/meetings/meeting-1/invitations',
        {
          method: 'PATCH',
          body: JSON.stringify({
            tenantId: 'tenant-1',
            memberId: 'member-2',
            response: 'accepted',
          }),
        }
      );

      await PATCH(request, await createParams('meeting-1'));

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          attendees: expect.arrayContaining([
            expect.objectContaining({
              memberId: 'member-2',
              response: 'accepted',
              respondedAt: expect.anything(),
            }),
          ]),
          updatedAt: expect.anything(),
        })
      );
    });

    it('should handle Firestore errors gracefully', async () => {
      mockGetDoc.mockRejectedValueOnce(new Error('Firestore error'));

      const request = new NextRequest(
        'http://localhost:3000/api/meetings/meeting-1/invitations',
        {
          method: 'PATCH',
          body: JSON.stringify({
            tenantId: 'tenant-1',
            memberId: 'member-1',
            response: 'accepted',
          }),
        }
      );

      const response = await PATCH(request, await createParams('meeting-1'));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to update RSVP');
    });
  });
});
