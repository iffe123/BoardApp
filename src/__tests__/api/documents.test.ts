/**
 * Document Upload API Tests
 *
 * Tests the document management functionality including:
 * - Creating document records
 * - Listing documents with filtering
 * - Document category handling
 */

import { NextRequest } from 'next/server';

// Mock auth, rate limiting, and logging before importing routes
jest.mock('@/lib/auth/verify-session', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { NextResponse } = require('next/server');
  return {
    verifySession: jest.fn().mockResolvedValue({
      user: { uid: 'test-user-123', email: 'test@example.com', name: 'Test User', tenants: { 'tenant-1': 'admin' } },
      token: 'mock-token',
    }),
    verifyTenantAccess: jest.fn(),
    verifyTenantRole: jest.fn(),
    authErrorResponse: jest.fn().mockImplementation((error: unknown) => {
      const err = error as { statusCode?: number; message?: string };
      return NextResponse.json({ error: err.message || 'Auth error' }, { status: err.statusCode || 401 });
    }),
    AuthError: class extends Error { statusCode: number; constructor(m: string, s: number) { super(m); this.statusCode = s; } },
  };
});

jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: jest.fn().mockReturnValue({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 }),
  RateLimits: { ai: { limit: 10 }, email: { limit: 20 }, bankid: { limit: 5 }, api: { limit: 100 }, auth: { limit: 10 } },
}));

jest.mock('@/lib/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// Mock Firebase before importing the route
jest.mock('@/lib/firebase', () => ({
  collections: {
    documents: jest.fn((tenantId: string) => ({
      path: `tenants/${tenantId}/documents`,
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
import { GET, POST } from '@/app/api/documents/route';

describe('Documents API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockImplementation((...args) => args);
    mockWhere.mockImplementation((...args) => args);
    mockOrderBy.mockImplementation((...args) => args);
  });

  describe('GET /api/documents', () => {
    it('should return 400 if tenantId is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/documents');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('tenantId is required');
    });

    it('should return documents for a tenant', async () => {
      const mockDocuments = [
        {
          id: 'doc-1',
          data: () => ({
            name: 'Board Pack Q1 2024',
            description: 'Quarterly board pack',
            category: 'board_pack',
            mimeType: 'application/pdf',
            size: 1024000,
            storagePath: '/tenants/tenant-1/documents/board-pack-q1.pdf',
            isArchived: false,
            meetingIds: ['meeting-1'],
            tags: ['q1', 'financials'],
            version: 1,
          }),
        },
        {
          id: 'doc-2',
          data: () => ({
            name: 'Minutes - January Meeting',
            description: 'Meeting minutes',
            category: 'minutes',
            mimeType: 'application/pdf',
            size: 512000,
            storagePath: '/tenants/tenant-1/documents/minutes-jan.pdf',
            isArchived: false,
            meetingIds: ['meeting-1'],
            tags: ['minutes'],
            version: 1,
          }),
        },
      ];

      mockGetDocs.mockResolvedValueOnce({
        forEach: (callback: (doc: typeof mockDocuments[0]) => void) => {
          mockDocuments.forEach(callback);
        },
      });

      const request = new NextRequest(
        'http://localhost:3000/api/documents?tenantId=tenant-1'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.documents).toHaveLength(2);
      expect(data.documents[0].id).toBe('doc-1');
      expect(data.documents[0].name).toBe('Board Pack Q1 2024');
      expect(data.documents[1].id).toBe('doc-2');
      expect(data.total).toBe(2);
    });

    it('should filter documents by category', async () => {
      const mockDocuments = [
        {
          id: 'doc-1',
          data: () => ({
            name: 'Board Pack Q1 2024',
            category: 'board_pack',
            isArchived: false,
            meetingIds: [],
          }),
        },
        {
          id: 'doc-2',
          data: () => ({
            name: 'Financial Report',
            category: 'financial',
            isArchived: false,
            meetingIds: [],
          }),
        },
      ];

      mockGetDocs.mockResolvedValueOnce({
        forEach: (callback: (doc: typeof mockDocuments[0]) => void) => {
          mockDocuments.forEach(callback);
        },
      });

      const request = new NextRequest(
        'http://localhost:3000/api/documents?tenantId=tenant-1&category=board_pack'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.documents).toHaveLength(1);
      expect(data.documents[0].category).toBe('board_pack');
    });

    it('should filter documents by meetingId', async () => {
      const mockDocuments = [
        {
          id: 'doc-1',
          data: () => ({
            name: 'Board Pack',
            category: 'board_pack',
            isArchived: false,
            meetingIds: ['meeting-1'],
          }),
        },
        {
          id: 'doc-2',
          data: () => ({
            name: 'Other Document',
            category: 'other',
            isArchived: false,
            meetingIds: ['meeting-2'],
          }),
        },
      ];

      mockGetDocs.mockResolvedValueOnce({
        forEach: (callback: (doc: typeof mockDocuments[0]) => void) => {
          mockDocuments.forEach(callback);
        },
      });

      const request = new NextRequest(
        'http://localhost:3000/api/documents?tenantId=tenant-1&meetingId=meeting-1'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.documents).toHaveLength(1);
      expect(data.documents[0].meetingIds).toContain('meeting-1');
    });

    it('should respect limit parameter', async () => {
      const mockDocuments = Array.from({ length: 10 }, (_, i) => ({
        id: `doc-${i}`,
        data: () => ({
          name: `Document ${i}`,
          category: 'other',
          isArchived: false,
          meetingIds: [],
        }),
      }));

      mockGetDocs.mockResolvedValueOnce({
        forEach: (callback: (doc: typeof mockDocuments[0]) => void) => {
          mockDocuments.forEach(callback);
        },
      });

      const request = new NextRequest(
        'http://localhost:3000/api/documents?tenantId=tenant-1&limit=5'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.documents).toHaveLength(5);
    });

    it('should handle Firestore errors gracefully', async () => {
      mockGetDocs.mockRejectedValueOnce(new Error('Firestore connection error'));

      const request = new NextRequest(
        'http://localhost:3000/api/documents?tenantId=tenant-1'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch documents');
    });
  });

  describe('POST /api/documents', () => {
    it('should return 400 if required fields are missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/documents', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: 'tenant-1',
          // Missing name and storagePath
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });

    it('should create a document record successfully', async () => {
      mockAddDoc.mockResolvedValueOnce({ id: 'new-doc-id' });

      const documentData = {
        tenantId: 'tenant-1',
        name: 'Board Pack Q2 2024',
        description: 'Q2 board meeting materials',
        category: 'board_pack',
        mimeType: 'application/pdf',
        size: 2048000,
        storagePath: '/tenants/tenant-1/documents/board-pack-q2.pdf',
        visibility: 'internal',
        uploadedBy: 'user-123',
        meetingIds: ['meeting-5'],
        tags: ['q2', 'board-pack'],
      };

      const request = new NextRequest('http://localhost:3000/api/documents', {
        method: 'POST',
        body: JSON.stringify(documentData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe('new-doc-id');
      expect(data.name).toBe('Board Pack Q2 2024');
      expect(data.category).toBe('board_pack');
      expect(data.version).toBe(1);
      expect(data.isArchived).toBe(false);
      expect(mockAddDoc).toHaveBeenCalled();
    });

    it('should use default values for optional fields', async () => {
      mockAddDoc.mockResolvedValueOnce({ id: 'new-doc-id' });

      const documentData = {
        tenantId: 'tenant-1',
        name: 'Simple Document',
        storagePath: '/tenants/tenant-1/documents/simple.pdf',
      };

      const request = new NextRequest('http://localhost:3000/api/documents', {
        method: 'POST',
        body: JSON.stringify(documentData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.category).toBe('other');
      expect(data.mimeType).toBe('application/octet-stream');
      expect(data.size).toBe(0);
      expect(data.visibility).toBe('internal');
      expect(data.uploadedBy).toBe('test-user-123');
      expect(data.meetingIds).toEqual([]);
      expect(data.tags).toEqual([]);
    });

    it('should handle Firestore errors during document creation', async () => {
      mockAddDoc.mockRejectedValueOnce(new Error('Firestore write error'));

      const documentData = {
        tenantId: 'tenant-1',
        name: 'Test Document',
        storagePath: '/tenants/tenant-1/documents/test.pdf',
      };

      const request = new NextRequest('http://localhost:3000/api/documents', {
        method: 'POST',
        body: JSON.stringify(documentData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create document');
    });

    it('should handle all document categories', async () => {
      const categories = ['board_pack', 'minutes', 'financial', 'policy', 'contract', 'other'];

      for (const category of categories) {
        mockAddDoc.mockResolvedValueOnce({ id: `doc-${category}` });

        const request = new NextRequest('http://localhost:3000/api/documents', {
          method: 'POST',
          body: JSON.stringify({
            tenantId: 'tenant-1',
            name: `${category} Document`,
            storagePath: `/tenants/tenant-1/documents/${category}.pdf`,
            category,
          }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.category).toBe(category);
      }
    });
  });
});
