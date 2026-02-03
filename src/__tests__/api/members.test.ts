/**
 * Team Member Invitation API Tests
 *
 * Tests the member management functionality including:
 * - Inviting new members
 * - Listing members with filtering
 * - Role-based permissions assignment
 * - Email invitation sending
 */

import { NextRequest } from 'next/server';

// Mock Firebase before importing the route
jest.mock('@/lib/firebase', () => ({
  collections: {
    members: jest.fn((tenantId: string) => ({
      path: `tenants/${tenantId}/members`,
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
const mockSendMemberInvitationEmail = jest.fn();
jest.mock('@/lib/email-service', () => ({
  sendMemberInvitationEmail: (...args: unknown[]) => mockSendMemberInvitationEmail(...args),
}));

// Mock Firestore operations
const mockGetDocs = jest.fn();
const mockAddDoc = jest.fn();
const mockGetDoc = jest.fn();
const mockQuery = jest.fn();
const mockOrderBy = jest.fn();

jest.mock('firebase/firestore', () => ({
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  query: (...args: unknown[]) => mockQuery(...args),
  orderBy: (...args: unknown[]) => mockOrderBy(...args),
}));

// Import route handlers after mocking
import { GET, POST } from '@/app/api/members/route';

describe('Members API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockImplementation((...args) => args);
    mockOrderBy.mockImplementation((...args) => args);
    mockSendMemberInvitationEmail.mockResolvedValue({ success: true, messageId: 'msg-123' });
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ name: 'Test Organization' }),
    });
  });

  describe('GET /api/members', () => {
    it('should return 400 if tenantId is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/members');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('tenantId is required');
    });

    it('should return all members for a tenant', async () => {
      const mockMembers = [
        {
          id: 'member-1',
          data: () => ({
            tenantId: 'tenant-1',
            userId: 'user-1',
            role: 'owner',
            title: 'CEO',
            department: 'Executive',
            isActive: true,
            permissions: {
              canCreateMeetings: true,
              canManageMembers: true,
              canAccessFinancials: true,
              canSignDocuments: true,
              canManageDocuments: true,
            },
          }),
        },
        {
          id: 'member-2',
          data: () => ({
            tenantId: 'tenant-1',
            userId: 'user-2',
            role: 'director',
            title: 'Board Member',
            department: 'Board',
            isActive: true,
            permissions: {
              canCreateMeetings: false,
              canManageMembers: false,
              canAccessFinancials: true,
              canSignDocuments: true,
              canManageDocuments: false,
            },
          }),
        },
      ];

      mockGetDocs.mockResolvedValueOnce({
        forEach: (callback: (doc: typeof mockMembers[0]) => void) => {
          mockMembers.forEach(callback);
        },
      });

      const request = new NextRequest(
        'http://localhost:3000/api/members?tenantId=tenant-1'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.members).toHaveLength(2);
      expect(data.members[0].id).toBe('member-1');
      expect(data.members[0].role).toBe('owner');
      expect(data.total).toBe(2);
    });

    it('should filter by active members only by default', async () => {
      const mockMembers = [
        {
          id: 'member-1',
          data: () => ({
            role: 'owner',
            isActive: true,
          }),
        },
        {
          id: 'member-2',
          data: () => ({
            role: 'director',
            isActive: false,
          }),
        },
      ];

      mockGetDocs.mockResolvedValueOnce({
        forEach: (callback: (doc: typeof mockMembers[0]) => void) => {
          mockMembers.forEach(callback);
        },
      });

      const request = new NextRequest(
        'http://localhost:3000/api/members?tenantId=tenant-1'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.members).toHaveLength(1);
      expect(data.members[0].isActive).toBe(true);
    });

    it('should include inactive members when activeOnly is false', async () => {
      const mockMembers = [
        {
          id: 'member-1',
          data: () => ({
            role: 'owner',
            isActive: true,
          }),
        },
        {
          id: 'member-2',
          data: () => ({
            role: 'director',
            isActive: false,
          }),
        },
      ];

      mockGetDocs.mockResolvedValueOnce({
        forEach: (callback: (doc: typeof mockMembers[0]) => void) => {
          mockMembers.forEach(callback);
        },
      });

      const request = new NextRequest(
        'http://localhost:3000/api/members?tenantId=tenant-1&activeOnly=false'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.members).toHaveLength(2);
    });

    it('should filter by role', async () => {
      const mockMembers = [
        {
          id: 'member-1',
          data: () => ({
            role: 'owner',
            isActive: true,
          }),
        },
        {
          id: 'member-2',
          data: () => ({
            role: 'director',
            isActive: true,
          }),
        },
        {
          id: 'member-3',
          data: () => ({
            role: 'director',
            isActive: true,
          }),
        },
      ];

      mockGetDocs.mockResolvedValueOnce({
        forEach: (callback: (doc: typeof mockMembers[0]) => void) => {
          mockMembers.forEach(callback);
        },
      });

      const request = new NextRequest(
        'http://localhost:3000/api/members?tenantId=tenant-1&role=director'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.members).toHaveLength(2);
      expect(data.members.every((m: { role: string }) => m.role === 'director')).toBe(true);
    });

    it('should handle Firestore errors gracefully', async () => {
      mockGetDocs.mockRejectedValueOnce(new Error('Firestore connection error'));

      const request = new NextRequest(
        'http://localhost:3000/api/members?tenantId=tenant-1'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch members');
    });
  });

  describe('POST /api/members (Invite Member)', () => {
    it('should return 400 if required fields are missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/members', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: 'tenant-1',
          // Missing email and role
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });

    it('should invite a new member with correct permissions for owner role', async () => {
      mockAddDoc.mockResolvedValueOnce({ id: 'new-member-id' });

      const inviteData = {
        tenantId: 'tenant-1',
        email: 'newmember@example.com',
        role: 'owner',
        title: 'Co-founder',
        department: 'Executive',
        invitedBy: 'John Doe',
      };

      const request = new NextRequest('http://localhost:3000/api/members', {
        method: 'POST',
        body: JSON.stringify(inviteData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe('new-member-id');
      expect(data.role).toBe('owner');
      expect(data.permissions).toEqual({
        canCreateMeetings: true,
        canManageMembers: true,
        canAccessFinancials: true,
        canSignDocuments: true,
        canManageDocuments: true,
      });
      expect(data.isActive).toBe(false); // Will be activated when user accepts
      expect(data.emailSent).toBe(true);
    });

    it('should invite a member with correct permissions for admin role', async () => {
      mockAddDoc.mockResolvedValueOnce({ id: 'new-member-id' });

      const request = new NextRequest('http://localhost:3000/api/members', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: 'tenant-1',
          email: 'admin@example.com',
          role: 'admin',
          invitedBy: 'John Doe',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.permissions).toEqual({
        canCreateMeetings: true,
        canManageMembers: true,
        canAccessFinancials: true,
        canSignDocuments: true,
        canManageDocuments: true,
      });
    });

    it('should invite a member with correct permissions for secretary role', async () => {
      mockAddDoc.mockResolvedValueOnce({ id: 'new-member-id' });

      const request = new NextRequest('http://localhost:3000/api/members', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: 'tenant-1',
          email: 'secretary@example.com',
          role: 'secretary',
          invitedBy: 'John Doe',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.permissions).toEqual({
        canCreateMeetings: true,
        canManageMembers: false,
        canAccessFinancials: true,
        canSignDocuments: true,
        canManageDocuments: true,
      });
    });

    it('should invite a member with correct permissions for chair role', async () => {
      mockAddDoc.mockResolvedValueOnce({ id: 'new-member-id' });

      const request = new NextRequest('http://localhost:3000/api/members', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: 'tenant-1',
          email: 'chair@example.com',
          role: 'chair',
          invitedBy: 'John Doe',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.permissions).toEqual({
        canCreateMeetings: true,
        canManageMembers: false,
        canAccessFinancials: true,
        canSignDocuments: true,
        canManageDocuments: false,
      });
    });

    it('should invite a member with correct permissions for director role', async () => {
      mockAddDoc.mockResolvedValueOnce({ id: 'new-member-id' });

      const request = new NextRequest('http://localhost:3000/api/members', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: 'tenant-1',
          email: 'director@example.com',
          role: 'director',
          invitedBy: 'John Doe',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.permissions).toEqual({
        canCreateMeetings: false,
        canManageMembers: false,
        canAccessFinancials: true,
        canSignDocuments: true,
        canManageDocuments: false,
      });
    });

    it('should invite a member with correct permissions for observer role', async () => {
      mockAddDoc.mockResolvedValueOnce({ id: 'new-member-id' });

      const request = new NextRequest('http://localhost:3000/api/members', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: 'tenant-1',
          email: 'observer@example.com',
          role: 'observer',
          invitedBy: 'John Doe',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.permissions).toEqual({
        canCreateMeetings: false,
        canManageMembers: false,
        canAccessFinancials: false,
        canSignDocuments: false,
        canManageDocuments: false,
      });
    });

    it('should invite a member with correct permissions for auditor role', async () => {
      mockAddDoc.mockResolvedValueOnce({ id: 'new-member-id' });

      const request = new NextRequest('http://localhost:3000/api/members', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: 'tenant-1',
          email: 'auditor@example.com',
          role: 'auditor',
          invitedBy: 'John Doe',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.permissions).toEqual({
        canCreateMeetings: false,
        canManageMembers: false,
        canAccessFinancials: true,
        canSignDocuments: false,
        canManageDocuments: false,
      });
    });

    it('should send invitation email with correct data', async () => {
      mockAddDoc.mockResolvedValueOnce({ id: 'new-member-id' });

      const request = new NextRequest('http://localhost:3000/api/members', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: 'tenant-1',
          email: 'newmember@example.com',
          role: 'director',
          title: 'Board Member',
          invitedBy: 'John Doe',
        }),
      });

      await POST(request);

      expect(mockSendMemberInvitationEmail).toHaveBeenCalledWith({
        recipientEmail: 'newmember@example.com',
        recipientName: 'Board Member',
        organizationName: 'Test Organization',
        inviterName: 'John Doe',
        role: 'Director', // Should be capitalized
        inviteUrl: expect.stringContaining('/auth/signup?invite=new-member-id'),
      });
    });

    it('should include email status in response', async () => {
      mockAddDoc.mockResolvedValueOnce({ id: 'new-member-id' });
      mockSendMemberInvitationEmail.mockResolvedValueOnce({ success: true });

      const request = new NextRequest('http://localhost:3000/api/members', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: 'tenant-1',
          email: 'test@example.com',
          role: 'director',
          invitedBy: 'John Doe',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.emailSent).toBe(true);
      expect(data.email).toBe('test@example.com');
    });

    it('should handle email send failure gracefully', async () => {
      mockAddDoc.mockResolvedValueOnce({ id: 'new-member-id' });
      mockSendMemberInvitationEmail.mockResolvedValueOnce({
        success: false,
        error: 'Email service unavailable'
      });

      const request = new NextRequest('http://localhost:3000/api/members', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: 'tenant-1',
          email: 'test@example.com',
          role: 'director',
          invitedBy: 'John Doe',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      // Member should still be created even if email fails
      expect(response.status).toBe(200);
      expect(data.id).toBe('new-member-id');
      expect(data.emailSent).toBe(false);
      expect(data.emailError).toBe('Email service unavailable');
    });

    it('should use default organization name if tenant not found', async () => {
      mockAddDoc.mockResolvedValueOnce({ id: 'new-member-id' });
      mockGetDoc.mockResolvedValueOnce({
        exists: () => false,
      });

      const request = new NextRequest('http://localhost:3000/api/members', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: 'tenant-1',
          email: 'test@example.com',
          role: 'director',
          invitedBy: 'John Doe',
        }),
      });

      await POST(request);

      expect(mockSendMemberInvitationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationName: 'Your Organization',
        })
      );
    });

    it('should handle Firestore errors during member creation', async () => {
      mockAddDoc.mockRejectedValueOnce(new Error('Firestore write error'));

      const request = new NextRequest('http://localhost:3000/api/members', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: 'tenant-1',
          email: 'test@example.com',
          role: 'director',
          invitedBy: 'John Doe',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to invite member');
    });
  });
});
