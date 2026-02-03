/**
 * Meeting Creation API Tests
 *
 * Tests the meeting management functionality including:
 * - Creating meetings with default agenda items
 * - Listing meetings with filtering
 * - Meeting status handling
 * - Attendee management
 */

import { NextRequest } from 'next/server';

// Mock Firebase before importing the route
jest.mock('@/lib/firebase', () => ({
  collections: {
    meetings: jest.fn((tenantId: string) => ({
      path: `tenants/${tenantId}/meetings`,
    })),
  },
  Timestamp: {
    now: jest.fn(() => ({
      toDate: () => new Date('2024-01-15T10:00:00Z'),
      seconds: 1705312800,
      nanoseconds: 0,
    })),
    fromDate: jest.fn((date: Date) => ({
      toDate: () => date,
      seconds: Math.floor(date.getTime() / 1000),
      nanoseconds: 0,
    })),
  },
}));

// Mock Firestore operations
const mockGetDocs = jest.fn();
const mockAddDoc = jest.fn();
const mockQuery = jest.fn();
const mockWhere = jest.fn();
const mockOrderBy = jest.fn();

jest.mock('firebase/firestore', () => ({
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  query: (...args: unknown[]) => mockQuery(...args),
  where: (...args: unknown[]) => mockWhere(...args),
  orderBy: (...args: unknown[]) => mockOrderBy(...args),
}));

// Import route handlers after mocking
import { GET, POST } from '@/app/api/meetings/route';

describe('Meetings API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockImplementation((...args) => args);
    mockWhere.mockImplementation((...args) => args);
    mockOrderBy.mockImplementation((...args) => args);
  });

  describe('GET /api/meetings', () => {
    it('should return 400 if tenantId is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/meetings');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('tenantId is required');
    });

    it('should return all meetings for a tenant', async () => {
      const mockMeetings = [
        {
          id: 'meeting-1',
          data: () => ({
            title: 'Q1 Board Meeting',
            description: 'Quarterly board meeting',
            meetingType: 'ordinary',
            status: 'scheduled',
            scheduledStart: { toDate: () => new Date('2024-02-01T09:00:00Z') },
            scheduledEnd: { toDate: () => new Date('2024-02-01T12:00:00Z') },
            quorumRequired: 3,
            attendees: [],
            agendaItems: [],
          }),
        },
        {
          id: 'meeting-2',
          data: () => ({
            title: 'Extraordinary Meeting',
            description: 'Urgent matters',
            meetingType: 'extraordinary',
            status: 'draft',
            scheduledStart: { toDate: () => new Date('2024-02-15T14:00:00Z') },
            scheduledEnd: { toDate: () => new Date('2024-02-15T15:30:00Z') },
            quorumRequired: 3,
            attendees: [],
            agendaItems: [],
          }),
        },
      ];

      mockGetDocs.mockResolvedValueOnce({
        forEach: (callback: (doc: typeof mockMeetings[0]) => void) => {
          mockMeetings.forEach(callback);
        },
      });

      const request = new NextRequest(
        'http://localhost:3000/api/meetings?tenantId=tenant-1'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.meetings).toHaveLength(2);
      expect(data.meetings[0].id).toBe('meeting-1');
      expect(data.meetings[0].title).toBe('Q1 Board Meeting');
      expect(data.total).toBe(2);
    });

    it('should filter meetings by status', async () => {
      const mockMeetings = [
        {
          id: 'meeting-1',
          data: () => ({
            title: 'Scheduled Meeting',
            status: 'scheduled',
          }),
        },
      ];

      mockGetDocs.mockResolvedValueOnce({
        forEach: (callback: (doc: typeof mockMeetings[0]) => void) => {
          mockMeetings.forEach(callback);
        },
      });

      const request = new NextRequest(
        'http://localhost:3000/api/meetings?tenantId=tenant-1&status=scheduled'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockWhere).toHaveBeenCalledWith('status', '==', 'scheduled');
    });

    it('should respect limit parameter', async () => {
      const mockMeetings = Array.from({ length: 10 }, (_, i) => ({
        id: `meeting-${i}`,
        data: () => ({
          title: `Meeting ${i}`,
          status: 'scheduled',
        }),
      }));

      mockGetDocs.mockResolvedValueOnce({
        forEach: (callback: (doc: typeof mockMeetings[0]) => void) => {
          mockMeetings.forEach(callback);
        },
      });

      const request = new NextRequest(
        'http://localhost:3000/api/meetings?tenantId=tenant-1&limit=5'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.meetings).toHaveLength(5);
    });

    it('should return all statuses when status=all', async () => {
      const mockMeetings = [
        {
          id: 'meeting-1',
          data: () => ({ title: 'Meeting 1', status: 'draft' }),
        },
        {
          id: 'meeting-2',
          data: () => ({ title: 'Meeting 2', status: 'scheduled' }),
        },
        {
          id: 'meeting-3',
          data: () => ({ title: 'Meeting 3', status: 'completed' }),
        },
      ];

      mockGetDocs.mockResolvedValueOnce({
        forEach: (callback: (doc: typeof mockMeetings[0]) => void) => {
          mockMeetings.forEach(callback);
        },
      });

      const request = new NextRequest(
        'http://localhost:3000/api/meetings?tenantId=tenant-1&status=all'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.meetings).toHaveLength(3);
    });

    it('should handle Firestore errors gracefully', async () => {
      mockGetDocs.mockRejectedValueOnce(new Error('Firestore connection error'));

      const request = new NextRequest(
        'http://localhost:3000/api/meetings?tenantId=tenant-1'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch meetings');
    });
  });

  describe('POST /api/meetings', () => {
    it('should return 400 if required fields are missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/meetings', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: 'tenant-1',
          title: 'Test Meeting',
          // Missing scheduledStart and scheduledEnd
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });

    it('should create a meeting with default agenda items', async () => {
      mockAddDoc.mockResolvedValueOnce({ id: 'new-meeting-id' });

      const meetingData = {
        tenantId: 'tenant-1',
        title: 'Q1 Board Meeting 2024',
        description: 'Quarterly board meeting',
        meetingType: 'ordinary',
        scheduledStart: '2024-02-01T09:00:00Z',
        scheduledEnd: '2024-02-01T12:00:00Z',
        timezone: 'Europe/Stockholm',
        location: {
          type: 'hybrid',
          address: '123 Business Street, Stockholm',
          room: 'Conference Room A',
          videoConferenceUrl: 'https://meet.example.com/abc123',
        },
        attendeeIds: ['user-1', 'user-2', 'user-3'],
        quorumRequired: 3,
        createdBy: 'user-1',
      };

      const request = new NextRequest('http://localhost:3000/api/meetings', {
        method: 'POST',
        body: JSON.stringify(meetingData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe('new-meeting-id');
      expect(data.title).toBe('Q1 Board Meeting 2024');
      expect(data.status).toBe('draft');
      expect(data.meetingType).toBe('ordinary');
      expect(data.agendaLocked).toBe(false);

      // Check default agenda items
      expect(data.agendaItems).toHaveLength(4);
      expect(data.agendaItems[0].title).toBe('Opening of the meeting');
      expect(data.agendaItems[0].type).toBe('formality');
      expect(data.agendaItems[1].title).toBe('Election of adjuster');
      expect(data.agendaItems[2].title).toBe('Approval of agenda');
      expect(data.agendaItems[3].title).toBe('Closing of the meeting');
    });

    it('should create attendees from attendeeIds', async () => {
      mockAddDoc.mockResolvedValueOnce({ id: 'new-meeting-id' });

      const meetingData = {
        tenantId: 'tenant-1',
        title: 'Board Meeting',
        scheduledStart: '2024-02-01T09:00:00Z',
        scheduledEnd: '2024-02-01T12:00:00Z',
        attendeeIds: ['user-1', 'user-2', 'user-3'],
      };

      const request = new NextRequest('http://localhost:3000/api/meetings', {
        method: 'POST',
        body: JSON.stringify(meetingData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.attendees).toHaveLength(3);
      expect(data.attendees[0].memberId).toBe('user-1');
      expect(data.attendees[0].role).toBe('chair'); // First attendee is chair
      expect(data.attendees[1].memberId).toBe('user-2');
      expect(data.attendees[1].role).toBe('secretary'); // Second attendee is secretary
      expect(data.attendees[2].memberId).toBe('user-3');
      expect(data.attendees[2].role).toBe('director'); // Others are directors
      expect(data.attendees.every((a: { response: string }) => a.response === 'pending')).toBe(true);
      expect(data.attendees.every((a: { hasVotingRights: boolean }) => a.hasVotingRights === true)).toBe(true);
    });

    it('should use default values for optional fields', async () => {
      mockAddDoc.mockResolvedValueOnce({ id: 'new-meeting-id' });

      const meetingData = {
        tenantId: 'tenant-1',
        title: 'Simple Meeting',
        scheduledStart: '2024-02-01T09:00:00Z',
        scheduledEnd: '2024-02-01T10:00:00Z',
      };

      const request = new NextRequest('http://localhost:3000/api/meetings', {
        method: 'POST',
        body: JSON.stringify(meetingData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.meetingType).toBe('ordinary');
      expect(data.timezone).toBe('Europe/Stockholm');
      expect(data.quorumRequired).toBe(3);
      expect(data.description).toBe('');
      expect(data.createdBy).toBe('system');
      expect(data.location.type).toBe('physical');
      expect(data.attendees).toHaveLength(0);
    });

    it('should handle different meeting types', async () => {
      const meetingTypes = ['ordinary', 'extraordinary', 'annual_general', 'statutory'] as const;

      for (const meetingType of meetingTypes) {
        mockAddDoc.mockResolvedValueOnce({ id: `meeting-${meetingType}` });

        const request = new NextRequest('http://localhost:3000/api/meetings', {
          method: 'POST',
          body: JSON.stringify({
            tenantId: 'tenant-1',
            title: `${meetingType} Meeting`,
            scheduledStart: '2024-02-01T09:00:00Z',
            scheduledEnd: '2024-02-01T12:00:00Z',
            meetingType,
          }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.meetingType).toBe(meetingType);
      }
    });

    it('should set correct initial status as draft', async () => {
      mockAddDoc.mockResolvedValueOnce({ id: 'new-meeting-id' });

      const request = new NextRequest('http://localhost:3000/api/meetings', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: 'tenant-1',
          title: 'Test Meeting',
          scheduledStart: '2024-02-01T09:00:00Z',
          scheduledEnd: '2024-02-01T12:00:00Z',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.status).toBe('draft');
      expect(data.agendaLocked).toBe(false);
      expect(data.documentIds).toEqual([]);
    });

    it('should handle location types correctly', async () => {
      const locationTypes = [
        { type: 'physical', address: '123 Main St', room: 'Room A' },
        { type: 'virtual', videoConferenceUrl: 'https://meet.example.com' },
        { type: 'hybrid', address: '123 Main St', videoConferenceUrl: 'https://meet.example.com' },
      ];

      for (const location of locationTypes) {
        mockAddDoc.mockResolvedValueOnce({ id: 'new-meeting-id' });

        const request = new NextRequest('http://localhost:3000/api/meetings', {
          method: 'POST',
          body: JSON.stringify({
            tenantId: 'tenant-1',
            title: 'Test Meeting',
            scheduledStart: '2024-02-01T09:00:00Z',
            scheduledEnd: '2024-02-01T12:00:00Z',
            location,
          }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.location.type).toBe(location.type);
      }
    });

    it('should handle Firestore errors during meeting creation', async () => {
      mockAddDoc.mockRejectedValueOnce(new Error('Firestore write error'));

      const request = new NextRequest('http://localhost:3000/api/meetings', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: 'tenant-1',
          title: 'Test Meeting',
          scheduledStart: '2024-02-01T09:00:00Z',
          scheduledEnd: '2024-02-01T12:00:00Z',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create meeting');
    });

    it('should set unique IDs for agenda items', async () => {
      mockAddDoc.mockResolvedValueOnce({ id: 'new-meeting-id' });

      const request = new NextRequest('http://localhost:3000/api/meetings', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: 'tenant-1',
          title: 'Test Meeting',
          scheduledStart: '2024-02-01T09:00:00Z',
          scheduledEnd: '2024-02-01T12:00:00Z',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      const agendaIds = data.agendaItems.map((item: { id: string }) => item.id);
      const uniqueIds = new Set(agendaIds);

      expect(uniqueIds.size).toBe(agendaIds.length);
      expect(agendaIds.every((id: string) => id.startsWith('agenda-'))).toBe(true);
    });

    it('should set correct order indexes for agenda items', async () => {
      mockAddDoc.mockResolvedValueOnce({ id: 'new-meeting-id' });

      const request = new NextRequest('http://localhost:3000/api/meetings', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: 'tenant-1',
          title: 'Test Meeting',
          scheduledStart: '2024-02-01T09:00:00Z',
          scheduledEnd: '2024-02-01T12:00:00Z',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      data.agendaItems.forEach((item: { orderIndex: number }, index: number) => {
        expect(item.orderIndex).toBe(index);
      });
    });
  });
});
