/**
 * Decisions API Tests
 *
 * Tests the decision management functionality including:
 * - Listing decisions with filtering by meetingId, outcome, implementationStatus
 * - Creating decisions with auto-generated decision numbers
 * - Audit log creation on decision recording
 * - Error handling for missing fields and Firestore failures
 */

import { NextRequest } from 'next/server';

// Mock Firebase before importing the route
jest.mock('@/lib/firebase', () => ({
  collections: {
    decisions: jest.fn((tenantId: string) => ({
      path: `tenants/${tenantId}/decisions`,
    })),
    meeting: jest.fn((tenantId: string, meetingId: string) => ({
      path: `tenants/${tenantId}/meetings/${meetingId}`,
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
  db: {},
}));

// Mock Firestore operations
const mockGetDocs = jest.fn();
const mockAddDoc = jest.fn();
const mockGetDoc = jest.fn();
const mockQuery = jest.fn();
const mockWhere = jest.fn();
const mockOrderBy = jest.fn();

jest.mock('firebase/firestore', () => ({
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  query: (...args: unknown[]) => mockQuery(...args),
  where: (...args: unknown[]) => mockWhere(...args),
  orderBy: (...args: unknown[]) => mockOrderBy(...args),
}));

// Mock audit service
const mockCreateAuditLog = jest.fn().mockResolvedValue('audit-log-id');

jest.mock('@/lib/audit-service', () => ({
  createAuditLog: (...args: unknown[]) => mockCreateAuditLog(...args),
}));

// Import route handlers after mocking
import { GET, POST } from '@/app/api/decisions/route';

describe('Decisions API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockImplementation((...args) => args);
    mockWhere.mockImplementation((...args) => args);
    mockOrderBy.mockImplementation((...args) => args);
    mockCreateAuditLog.mockResolvedValue('audit-log-id');
  });

  describe('GET /api/decisions', () => {
    it('should return 400 if tenantId is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/decisions');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('tenantId is required');
    });

    it('should list decisions for a tenant', async () => {
      const mockDecisions = [
        {
          id: 'decision-1',
          data: () => ({
            tenantId: 'tenant-1',
            meetingId: 'meeting-1',
            decisionNumber: 'D-2024-001',
            title: 'Approve Q1 Budget',
            outcome: 'approved',
            implementationStatus: 'pending',
            decidedAt: { toDate: () => new Date('2024-01-10T10:00:00Z') },
          }),
        },
        {
          id: 'decision-2',
          data: () => ({
            tenantId: 'tenant-1',
            meetingId: 'meeting-2',
            decisionNumber: 'D-2024-002',
            title: 'New Office Lease',
            outcome: 'rejected',
            implementationStatus: 'not_applicable',
            decidedAt: { toDate: () => new Date('2024-01-12T14:00:00Z') },
          }),
        },
      ];

      mockGetDocs.mockResolvedValueOnce({
        forEach: (callback: (doc: typeof mockDecisions[0]) => void) => {
          mockDecisions.forEach(callback);
        },
      });

      const request = new NextRequest(
        'http://localhost:3000/api/decisions?tenantId=tenant-1'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.decisions).toHaveLength(2);
      expect(data.decisions[0].id).toBe('decision-1');
      expect(data.decisions[0].title).toBe('Approve Q1 Budget');
      expect(data.decisions[1].id).toBe('decision-2');
      expect(data.decisions[1].title).toBe('New Office Lease');
      expect(data.total).toBe(2);
    });

    it('should filter decisions by meetingId', async () => {
      const mockDecisions = [
        {
          id: 'decision-1',
          data: () => ({
            title: 'Budget Approval',
            outcome: 'approved',
            meetingId: 'meeting-1',
          }),
        },
        {
          id: 'decision-2',
          data: () => ({
            title: 'Other Decision',
            outcome: 'approved',
            meetingId: 'meeting-2',
          }),
        },
      ];

      mockGetDocs.mockResolvedValueOnce({
        forEach: (callback: (doc: typeof mockDecisions[0]) => void) => {
          mockDecisions.forEach(callback);
        },
      });

      const request = new NextRequest(
        'http://localhost:3000/api/decisions?tenantId=tenant-1&meetingId=meeting-1'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.decisions).toHaveLength(1);
      expect(data.decisions[0].meetingId).toBe('meeting-1');
      expect(data.total).toBe(1);
    });

    it('should filter decisions by outcome', async () => {
      const mockDecisions = [
        {
          id: 'decision-1',
          data: () => ({
            title: 'Approved Decision',
            outcome: 'approved',
            meetingId: 'meeting-1',
          }),
        },
        {
          id: 'decision-2',
          data: () => ({
            title: 'Rejected Decision',
            outcome: 'rejected',
            meetingId: 'meeting-1',
          }),
        },
      ];

      mockGetDocs.mockResolvedValueOnce({
        forEach: (callback: (doc: typeof mockDecisions[0]) => void) => {
          mockDecisions.forEach(callback);
        },
      });

      const request = new NextRequest(
        'http://localhost:3000/api/decisions?tenantId=tenant-1&outcome=approved'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.decisions).toHaveLength(1);
      expect(data.decisions[0].outcome).toBe('approved');
      expect(data.total).toBe(1);
    });

    it('should return all outcomes when outcome=all', async () => {
      const mockDecisions = [
        { id: '1', data: () => ({ outcome: 'approved', meetingId: 'm1' }) },
        { id: '2', data: () => ({ outcome: 'rejected', meetingId: 'm1' }) },
        { id: '3', data: () => ({ outcome: 'tabled', meetingId: 'm1' }) },
      ];

      mockGetDocs.mockResolvedValueOnce({
        forEach: (callback: (doc: typeof mockDecisions[0]) => void) => {
          mockDecisions.forEach(callback);
        },
      });

      const request = new NextRequest(
        'http://localhost:3000/api/decisions?tenantId=tenant-1&outcome=all'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.decisions).toHaveLength(3);
    });

    it('should filter decisions by implementationStatus', async () => {
      const mockDecisions = [
        {
          id: 'decision-1',
          data: () => ({
            title: 'Pending Decision',
            outcome: 'approved',
            meetingId: 'meeting-1',
            implementationStatus: 'pending',
          }),
        },
        {
          id: 'decision-2',
          data: () => ({
            title: 'Completed Decision',
            outcome: 'approved',
            meetingId: 'meeting-1',
            implementationStatus: 'completed',
          }),
        },
      ];

      mockGetDocs.mockResolvedValueOnce({
        forEach: (callback: (doc: typeof mockDecisions[0]) => void) => {
          mockDecisions.forEach(callback);
        },
      });

      const request = new NextRequest(
        'http://localhost:3000/api/decisions?tenantId=tenant-1&implementationStatus=completed'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.decisions).toHaveLength(1);
      expect(data.decisions[0].implementationStatus).toBe('completed');
      expect(data.total).toBe(1);
    });

    it('should return all statuses when implementationStatus=all', async () => {
      const mockDecisions = [
        { id: '1', data: () => ({ outcome: 'approved', meetingId: 'm1', implementationStatus: 'pending' }) },
        { id: '2', data: () => ({ outcome: 'approved', meetingId: 'm1', implementationStatus: 'completed' }) },
      ];

      mockGetDocs.mockResolvedValueOnce({
        forEach: (callback: (doc: typeof mockDecisions[0]) => void) => {
          mockDecisions.forEach(callback);
        },
      });

      const request = new NextRequest(
        'http://localhost:3000/api/decisions?tenantId=tenant-1&implementationStatus=all'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.decisions).toHaveLength(2);
    });

    it('should respect limit parameter', async () => {
      const mockDecisions = Array.from({ length: 10 }, (_, i) => ({
        id: `decision-${i}`,
        data: () => ({
          title: `Decision ${i}`,
          outcome: 'approved',
          meetingId: 'meeting-1',
          decisionNumber: `D-2024-${String(i + 1).padStart(3, '0')}`,
        }),
      }));

      mockGetDocs.mockResolvedValueOnce({
        forEach: (callback: (doc: typeof mockDecisions[0]) => void) => {
          mockDecisions.forEach(callback);
        },
      });

      const request = new NextRequest(
        'http://localhost:3000/api/decisions?tenantId=tenant-1&limit=3'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.decisions).toHaveLength(3);
      expect(data.total).toBe(10);
    });

    it('should handle Firestore errors gracefully', async () => {
      mockGetDocs.mockRejectedValueOnce(new Error('Firestore connection error'));

      const request = new NextRequest(
        'http://localhost:3000/api/decisions?tenantId=tenant-1'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch decisions');
    });
  });

  describe('POST /api/decisions', () => {
    it('should return 400 if required fields are missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/decisions', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: 'tenant-1',
          title: 'Some Decision',
          // Missing meetingId and outcome
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields (tenantId, meetingId, title, outcome)');
    });

    it('should return 400 if tenantId is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/decisions', {
        method: 'POST',
        body: JSON.stringify({
          meetingId: 'meeting-1',
          title: 'Some Decision',
          outcome: 'approved',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields (tenantId, meetingId, title, outcome)');
    });

    it('should return 400 if outcome is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/decisions', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: 'tenant-1',
          meetingId: 'meeting-1',
          title: 'Some Decision',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields (tenantId, meetingId, title, outcome)');
    });

    it('should create a decision successfully with all fields', async () => {
      // Mock getDocs for auto-generating decision number
      mockGetDocs.mockResolvedValueOnce({ size: 5 });
      mockAddDoc.mockResolvedValueOnce({ id: 'new-decision-id' });

      const decisionData = {
        tenantId: 'tenant-1',
        meetingId: 'meeting-1',
        agendaItemId: 'agenda-item-3',
        userId: 'user-1',
        userName: 'Anna Svensson',
        title: 'Approve Annual Budget 2024',
        description: 'The board approves the annual budget for fiscal year 2024.',
        motion: 'Motion to approve the annual budget as presented by the CFO.',
        outcome: 'approved',
        votingMethod: 'roll_call',
        votesFor: 5,
        votesAgainst: 1,
        abstentions: 1,
        participantIds: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7'],
        recusedMemberIds: ['user-8'],
        actionItems: [
          { title: 'Distribute budget to departments', assigneeId: 'user-2' },
        ],
        implementationDeadline: '2024-03-01T00:00:00Z',
        relatedDocumentIds: ['doc-1', 'doc-2'],
      };

      const request = new NextRequest('http://localhost:3000/api/decisions', {
        method: 'POST',
        body: JSON.stringify(decisionData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe('new-decision-id');
      expect(data.title).toBe('Approve Annual Budget 2024');
      expect(data.description).toBe('The board approves the annual budget for fiscal year 2024.');
      expect(data.motion).toBe('Motion to approve the annual budget as presented by the CFO.');
      expect(data.outcome).toBe('approved');
      expect(data.votingMethod).toBe('roll_call');
      expect(data.votesFor).toBe(5);
      expect(data.votesAgainst).toBe(1);
      expect(data.abstentions).toBe(1);
      expect(data.participantIds).toHaveLength(7);
      expect(data.recusedMemberIds).toEqual(['user-8']);
      expect(data.implementationStatus).toBe('pending');
      expect(data.relatedDocumentIds).toEqual(['doc-1', 'doc-2']);
      expect(data.relatedDecisionIds).toEqual([]);
      expect(data.recordedBy).toBe('user-1');
      expect(data.agendaItemId).toBe('agenda-item-3');
      expect(data.decisionNumber).toMatch(/^D-\d{4}-006$/);
    });

    it('should auto-generate decisionNumber when not provided', async () => {
      // Mock getDocs to return existing decisions count
      mockGetDocs.mockResolvedValueOnce({ size: 7 });
      mockAddDoc.mockResolvedValueOnce({ id: 'new-decision-id' });

      const year = new Date().getFullYear();

      const request = new NextRequest('http://localhost:3000/api/decisions', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: 'tenant-1',
          meetingId: 'meeting-1',
          title: 'Auto-numbered Decision',
          outcome: 'approved',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.decisionNumber).toBe(`D-${year}-008`);
    });

    it('should use provided decisionNumber when given', async () => {
      mockAddDoc.mockResolvedValueOnce({ id: 'new-decision-id' });

      const request = new NextRequest('http://localhost:3000/api/decisions', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: 'tenant-1',
          meetingId: 'meeting-1',
          title: 'Custom-numbered Decision',
          outcome: 'approved',
          decisionNumber: 'CUSTOM-001',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.decisionNumber).toBe('CUSTOM-001');
    });

    it('should create audit log for new decisions', async () => {
      // Mock getDocs for decision number generation
      mockGetDocs.mockResolvedValueOnce({ size: 0 });
      mockAddDoc.mockResolvedValueOnce({ id: 'new-decision-id' });

      const request = new NextRequest('http://localhost:3000/api/decisions', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: 'tenant-1',
          meetingId: 'meeting-1',
          title: 'Audit Test Decision',
          outcome: 'approved',
          userId: 'user-1',
          userName: 'Test User',
        }),
      });

      await POST(request);

      expect(mockCreateAuditLog).toHaveBeenCalledTimes(1);
      expect(mockCreateAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          action: 'decision.recorded',
          resourceType: 'decision',
          resourceId: 'new-decision-id',
          actorId: 'user-1',
          actorName: 'Test User',
          metadata: expect.objectContaining({
            title: 'Audit Test Decision',
            outcome: 'approved',
            meetingId: 'meeting-1',
          }),
        })
      );
    });

    it('should set default values for optional fields', async () => {
      mockGetDocs.mockResolvedValueOnce({ size: 0 });
      mockAddDoc.mockResolvedValueOnce({ id: 'new-decision-id' });

      const request = new NextRequest('http://localhost:3000/api/decisions', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: 'tenant-1',
          meetingId: 'meeting-1',
          title: 'Minimal Decision',
          outcome: 'approved',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.agendaItemId).toBe('');
      expect(data.description).toBe('');
      expect(data.motion).toBe('');
      expect(data.votingMethod).toBe('show_of_hands');
      expect(data.votesFor).toBe(0);
      expect(data.votesAgainst).toBe(0);
      expect(data.abstentions).toBe(0);
      expect(data.participantIds).toEqual([]);
      expect(data.recusedMemberIds).toEqual([]);
      expect(data.actionItems).toEqual([]);
      expect(data.relatedDocumentIds).toEqual([]);
      expect(data.relatedDecisionIds).toEqual([]);
      expect(data.recordedBy).toBe('unknown');
    });

    it('should handle Firestore errors during decision creation', async () => {
      mockGetDocs.mockResolvedValueOnce({ size: 0 });
      mockAddDoc.mockRejectedValueOnce(new Error('Firestore write error'));

      const request = new NextRequest('http://localhost:3000/api/decisions', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: 'tenant-1',
          meetingId: 'meeting-1',
          title: 'Failed Decision',
          outcome: 'approved',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create decision');
    });
  });
});
