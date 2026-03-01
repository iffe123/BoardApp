import { NextRequest } from 'next/server';

jest.mock('@/lib/auth/verify-session', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { NextResponse } = require('next/server');
  return {
    verifySession: jest.fn().mockResolvedValue({
      user: { uid: 'user-1', tenants: { 'tenant-1': 'admin' } },
    }),
    verifyTenantAccess: jest.fn(),
    verifyTenantRole: jest.fn(),
    authErrorResponse: jest.fn().mockImplementation((error: unknown) => {
      const err = error as { statusCode?: number; message?: string };
      return NextResponse.json({ error: err.message || 'Auth error' }, { status: err.statusCode || 401 });
    }),
    AuthError: class extends Error {
      statusCode: number;
      constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
      }
    },
  };
});

jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: jest.fn().mockReturnValue({ allowed: true }),
  RateLimits: { api: { limit: 100 } },
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const createMock = jest.fn();
jest.mock('@/lib/dal/shareholders', () => ({
  shareholdersDAL: {
    list: jest.fn(),
    listActive: jest.fn(),
    create: (...args: unknown[]) => createMock(...args),
  },
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'shareholder-123'),
}));

import { POST } from '@/app/api/shareholders/route';

describe('POST /api/shareholders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createMock.mockResolvedValue(undefined);
  });

  it('returns 400 when address is partially filled', async () => {
    const request = new NextRequest('http://localhost:3000/api/shareholders', {
      method: 'POST',
      body: JSON.stringify({
        tenantId: 'tenant-1',
        name: 'Anna Andersson',
        type: 'individual',
        address: {
          street: 'Sveavägen 1',
          city: '',
          postalCode: '11122',
          country: 'Sverige',
        },
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Invalid input');
    expect(createMock).not.toHaveBeenCalled();
  });

  it('creates tenant-scoped shareholder with expected write shape', async () => {
    const request = new NextRequest('http://localhost:3000/api/shareholders', {
      method: 'POST',
      body: JSON.stringify({
        tenantId: 'tenant-1',
        name: 'Anna Andersson',
        type: 'individual',
        organizationNumber: '19900101-1234',
        email: 'anna@example.com',
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(createMock).toHaveBeenCalledWith(
      'tenant-1',
      'shareholder-123',
      expect.objectContaining({
        tenantId: 'tenant-1',
        name: 'Anna Andersson',
        type: 'individual',
        organizationNumber: '19900101-1234',
        email: 'anna@example.com',
        isActive: true,
      })
    );
    expect(body.id).toBe('shareholder-123');
  });
});
