import { NextRequest, NextResponse } from 'next/server';

jest.mock('@/lib/auth/verify-session', () => {
  return {
    verifySession: jest.fn().mockResolvedValue({ user: { uid: 'user-1', name: 'Test User' } }),
    verifyTenantAccess: jest.fn(),
    authErrorResponse: jest.fn().mockImplementation((error: { message?: string; statusCode?: number }) =>
      NextResponse.json({ error: error.message || 'Auth error' }, { status: error.statusCode || 401 })
    ),
    AuthError: class extends Error { statusCode: number; constructor(m: string, s: number) { super(m); this.statusCode = s; } },
  };
});

jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: jest.fn().mockReturnValue({ allowed: true }),
  RateLimits: { bankid: { limit: 5 } },
}));

jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), error: jest.fn() } }));

const mockAddDoc = jest.fn().mockResolvedValue({ id: 'signature-1' });
const mockSignatures = jest.fn((tenantId: string) => ({ path: `tenants/${tenantId}/signatures` }));

jest.mock('@/lib/firebase', () => ({
  collections: { signatures: (...args: unknown[]) => mockSignatures(...args) },
  Timestamp: { now: jest.fn(() => ({ seconds: 1, nanoseconds: 0 })) },
}));

jest.mock('firebase/firestore', () => ({
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
}));

jest.mock('@/lib/audit-service', () => ({ createAuditLog: jest.fn().mockResolvedValue(undefined) }));

import { POST } from '@/app/api/bankid/sign/route';

describe('POST /api/bankid/sign', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.BANKID_USE_MOCK = 'true';
  });

  it('writes signature case under tenant path', async () => {
    const request = new NextRequest('http://localhost:3000/api/bankid/sign', {
      method: 'POST',
      body: JSON.stringify({
        tenantId: 'tenant-1',
        documentId: 'doc-1',
        documentType: 'document',
        userVisibleData: 'Sign this document',
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockSignatures).toHaveBeenCalledWith('tenant-1');
    expect(mockAddDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'tenants/tenant-1/signatures' }),
      expect.objectContaining({
        tenantId: 'tenant-1',
        documentId: 'doc-1',
        status: 'pending',
        createdAt: expect.any(Object),
        updatedAt: expect.any(Object),
      })
    );
    expect(body.success).toBe(true);
    expect(body.signatureId).toBe('signature-1');
  });
});
