/**
 * Shared auth mock for API route tests.
 *
 * Call `setupAuthMock()` at the top of your test file (before imports)
 * to mock the auth middleware so API routes don't require tokens.
 */

export const mockUser = {
  uid: 'test-user-123',
  email: 'test@example.com',
  name: 'Test User',
  tenants: {
    'tenant-1': 'admin',
    'tenant-2': 'director',
  },
};

export function setupAuthMock() {
  jest.mock('@/lib/auth/verify-session', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { NextResponse } = require('next/server');
    return {
      verifySession: jest.fn().mockResolvedValue({
        user: mockUser,
        token: 'mock-token',
      }),
      verifyTenantAccess: jest.fn(),
      verifyTenantRole: jest.fn(),
      authErrorResponse: jest.fn().mockImplementation((error: unknown) => {
        const err = error as { statusCode?: number; message?: string };
        return NextResponse.json(
          { error: err.message || 'Auth error' },
          { status: err.statusCode || 401 }
        );
      }),
      AuthError: class AuthError extends Error {
      statusCode: number;
      constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
      }
    },
    };
  });

  jest.mock('@/lib/rate-limit', () => ({
    checkRateLimit: jest.fn().mockReturnValue({
      allowed: true,
      remaining: 99,
      resetAt: Date.now() + 60000,
    }),
    RateLimits: {
      ai: { limit: 10, windowMs: 60000 },
      email: { limit: 20, windowMs: 60000 },
      bankid: { limit: 5, windowMs: 60000 },
      api: { limit: 100, windowMs: 60000 },
      auth: { limit: 10, windowMs: 60000 },
    },
  }));

  jest.mock('@/lib/logger', () => ({
    logger: {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
  }));
}
