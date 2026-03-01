import { NextRequest, NextResponse } from 'next/server';

jest.mock('@/lib/auth/verify-session', () => {
  return {
    verifySession: jest.fn().mockResolvedValue({ user: { uid: 'user-1', name: 'User One' } }),
    verifyTenantAccess: jest.fn(),
    verifyTenantRole: jest.fn(),
    authErrorResponse: jest.fn().mockImplementation((error: { message?: string; statusCode?: number }) =>
      NextResponse.json({ error: error.message || 'Auth error' }, { status: error.statusCode || 401 })
    ),
    AuthError: class extends Error { statusCode: number; constructor(m: string, s: number) { super(m); this.statusCode = s; } },
  };
});

jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: jest.fn().mockReturnValue({ allowed: true }),
  RateLimits: { api: { limit: 100 } },
}));

jest.mock('@/lib/logger', () => ({ logger: { error: jest.fn(), info: jest.fn() } }));

const mockCreate = jest.fn();
jest.mock('@/lib/dal/shareholders', () => ({
  shareholdersDAL: {
    create: (...args: unknown[]) => mockCreate(...args),
    list: jest.fn(),
    listActive: jest.fn(),
  },
}));

jest.mock('uuid', () => ({ v4: jest.fn(() => 'shareholder-1') }));

import { POST } from '@/app/api/shareholders/route';

describe('POST /api/shareholders', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates tenant-scoped shareholder with active status', async () => {
    const request = new NextRequest('http://localhost:3000/api/shareholders', {
      method: 'POST',
      body: JSON.stringify({
        tenantId: 'tenant-1',
        name: 'Jane Doe',
        type: 'individual',
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(mockCreate).toHaveBeenCalledWith(
      'tenant-1',
      'shareholder-1',
      expect.objectContaining({
        tenantId: 'tenant-1',
        name: 'Jane Doe',
        type: 'individual',
        isActive: true,
      })
    );
    expect(body).toEqual(expect.objectContaining({ id: 'shareholder-1', tenantId: 'tenant-1' }));
  });
});
