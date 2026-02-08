/**
 * Settings API Tests
 *
 * Tests the tenant settings management functionality including:
 * - Fetching tenant settings
 * - Updating tenant settings with audit logging
 * - Handling not-found tenants
 * - Error handling for missing fields and Firestore failures
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
    tenant: jest.fn((tenantId: string) => ({
      path: `tenants/${tenantId}`,
      id: tenantId,
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
const mockGetDoc = jest.fn();
const mockUpdateDoc = jest.fn();

jest.mock('firebase/firestore', () => ({
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
}));

// Mock audit service
const mockCreateAuditLog = jest.fn().mockResolvedValue('audit-log-id');

jest.mock('@/lib/audit-service', () => ({
  createAuditLog: (...args: unknown[]) => mockCreateAuditLog(...args),
  AuditActions: {
    SETTINGS_UPDATED: 'settings.updated',
  },
  getRequestMetadata: jest.fn(() => ({
    actorIp: '127.0.0.1',
    actorUserAgent: 'test-agent',
  })),
}));

// Import route handlers after mocking
import { GET, PATCH } from '@/app/api/settings/route';

describe('Settings API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateAuditLog.mockResolvedValue('audit-log-id');
  });

  describe('GET /api/settings', () => {
    it('should return 400 if tenantId is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/settings');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('tenantId is required');
    });

    it('should return tenant settings', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        id: 'tenant-1',
        data: () => ({
          name: 'Test Organization AB',
          organizationNumber: '556123-4567',
          website: 'https://example.com',
          address: {
            street: 'Storgatan 1',
            city: 'Stockholm',
            postalCode: '111 22',
            country: 'Sweden',
          },
          settings: {
            language: 'sv',
            timezone: 'Europe/Stockholm',
            fiscalYearEnd: 12,
          },
        }),
      });

      const request = new NextRequest(
        'http://localhost:3000/api/settings?tenantId=tenant-1'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tenant.id).toBe('tenant-1');
      expect(data.tenant.name).toBe('Test Organization AB');
      expect(data.tenant.organizationNumber).toBe('556123-4567');
      expect(data.tenant.website).toBe('https://example.com');
      expect(data.tenant.settings.language).toBe('sv');
      expect(data.tenant.settings.timezone).toBe('Europe/Stockholm');
    });

    it('should return 404 if tenant not found', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => false,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/settings?tenantId=nonexistent'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Tenant not found');
    });

    it('should handle Firestore errors gracefully', async () => {
      mockGetDoc.mockRejectedValueOnce(new Error('Firestore connection error'));

      const request = new NextRequest(
        'http://localhost:3000/api/settings?tenantId=tenant-1'
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch settings');
    });
  });

  describe('PATCH /api/settings', () => {
    it('should return 400 if tenantId is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          updates: { name: 'New Name' },
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('tenantId is required');
    });

    it('should return 404 if tenant not found', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => false,
      });

      const request = new NextRequest('http://localhost:3000/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          tenantId: 'nonexistent',
          updates: { name: 'New Name' },
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Tenant not found');
    });

    it('should update tenant settings successfully', async () => {
      const oldData = {
        name: 'Old Organization Name',
        organizationNumber: '556123-4567',
        settings: { language: 'sv', timezone: 'Europe/Stockholm' },
      };

      // First getDoc call (check exists and get old data)
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => oldData,
      });

      mockUpdateDoc.mockResolvedValueOnce(undefined);

      // Second getDoc call (fetch updated tenant)
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        id: 'tenant-1',
        data: () => ({
          ...oldData,
          name: 'New Organization Name',
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          tenantId: 'tenant-1',
          userId: 'user-1',
          userName: 'Admin User',
          updates: { name: 'New Organization Name' },
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tenant.name).toBe('New Organization Name');
      expect(data.tenant.id).toBe('tenant-1');
      expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    });

    it('should create audit log on settings update', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ name: 'Old Name', settings: {} }),
      });

      mockUpdateDoc.mockResolvedValueOnce(undefined);

      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        id: 'tenant-1',
        data: () => ({ name: 'New Name', settings: {} }),
      });

      const request = new NextRequest('http://localhost:3000/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          tenantId: 'tenant-1',
          userId: 'user-1',
          userName: 'Admin User',
          updates: { name: 'New Name' },
        }),
      });

      await PATCH(request);

      expect(mockCreateAuditLog).toHaveBeenCalledTimes(1);
      expect(mockCreateAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          action: 'settings.updated',
          resourceType: 'settings',
          resourceId: 'tenant-1',
          actorId: 'test-user-123',
          actorName: 'Test User',
        })
      );
    });

    it('should merge nested settings updates', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          name: 'Test Org',
          settings: { language: 'sv', timezone: 'Europe/Stockholm' },
        }),
      });

      mockUpdateDoc.mockResolvedValueOnce(undefined);

      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        id: 'tenant-1',
        data: () => ({
          name: 'Test Org',
          settings: { language: 'en', timezone: 'Europe/Stockholm' },
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          tenantId: 'tenant-1',
          updates: { settings: { language: 'en' } },
        }),
      });

      const response = await PATCH(request);
      await response.json();

      expect(response.status).toBe(200);
      // Verify updateDoc was called with merged settings preserving existing fields
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          settings: expect.objectContaining({
            language: 'en',
            timezone: 'Europe/Stockholm',
          }),
        })
      );
    });

    it('should handle Firestore errors during update', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ name: 'Test', settings: {} }),
      });

      mockUpdateDoc.mockRejectedValueOnce(new Error('Firestore write error'));

      const request = new NextRequest('http://localhost:3000/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          tenantId: 'tenant-1',
          updates: { name: 'New Name' },
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to update settings');
    });
  });
});
