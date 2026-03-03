import { NextRequest } from 'next/server';

jest.mock('@/lib/auth/verify-session', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { NextResponse } = require('next/server');
  return {
    verifySession: jest.fn().mockResolvedValue({ user: { uid: 'admin-1', name: 'Admin User', tenants: { 'tenant-1': 'admin' } } }),
    verifyTenantRole: jest.fn(),
    authErrorResponse: jest.fn().mockImplementation((error: { message?: string; statusCode?: number }) =>
      NextResponse.json({ error: error.message || 'Auth error' }, { status: error.statusCode || 401 })),
    AuthError: class extends Error { statusCode: number; constructor(m: string, s: number) { super(m); this.statusCode = s; } },
  };
});

jest.mock('@/lib/logger', () => ({ logger: { error: jest.fn() } }));

jest.mock('@/lib/audit-service', () => ({
  createAuditLog: jest.fn().mockResolvedValue('audit-id'),
  getRequestMetadata: jest.fn(() => ({ actorIp: '127.0.0.1', actorUserAgent: 'jest' })),
}));

jest.mock('@/lib/firebase', () => ({
  collections: {
    exportJob: jest.fn((tenantId: string, exportId: string) => ({ path: `tenants/${tenantId}/exports/${exportId}`, id: exportId })),
  },
  Timestamp: {
    now: jest.fn(() => ({ toDate: () => new Date('2026-01-01T00:00:00.000Z') })),
  },
}));

const mockGetDoc = jest.fn();
const mockSetDoc = jest.fn();

jest.mock('firebase/firestore', () => ({
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
}));

import { POST } from '@/app/api/exports/exit-mode/route';

describe('Exit mode API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates export metadata and storage payload', async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => false });
    mockSetDoc.mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost:3000/api/exports/exit-mode', {
      method: 'POST',
      body: JSON.stringify({
        tenantId: 'tenant-1',
        from: '2025-01-01',
        to: '2025-12-31',
        boardrooms: ['Main'],
        contentTypes: ['minutes', 'decisions'],
      }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('ready');
    expect(mockSetDoc).toHaveBeenCalledTimes(2);

    const finalPayload = mockSetDoc.mock.calls[1][1];
    expect(finalPayload.storagePath).toContain('/exports/');
    expect(finalPayload.downloadData).toBeTruthy();
    expect(finalPayload.manifest.length).toBe(2);
  });
});
