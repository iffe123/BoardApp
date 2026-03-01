import { NextRequest } from 'next/server';

jest.mock('@/lib/auth/verify-session', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { NextResponse } = require('next/server');
  return {
    verifySession: jest.fn().mockResolvedValue({ user: { uid: 'u1', email: 'u@test.com', tenants: { t1: 'admin' } } }),
    verifyTenantAccess: jest.fn().mockResolvedValue(undefined),
    authErrorResponse: jest.fn((e: Error) => NextResponse.json({ error: e.message }, { status: 401 })),
    AuthError: class extends Error {},
  };
});

const mockSetDoc = jest.fn();
const mockGetDocs = jest.fn();

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => ({ path: 'x' })),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  collection: jest.fn(() => ({ path: 'c' })),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
}));

jest.mock('@/lib/firebase', () => ({
  Timestamp: { now: jest.fn(() => ({ toMillis: () => Date.now() })), fromMillis: jest.fn(() => ({ toMillis: () => Date.now() + 1000 })) },
  collections: { user: jest.fn(() => ({ path: 'users/u1' })), tenant: jest.fn(() => ({ path: 'tenants/t1' })) },
  getDoc: jest.fn().mockResolvedValue({ exists: () => true, data: () => ({ securityPolicy: { requireWebAuthnStepUp: true, sessionTtlHours: 12, enforceForDashboard: true } }) }),
}));

import { POST as registerOptionsPost } from '@/app/api/auth/webauthn/register/options/route';
import { POST as authOptionsPost } from '@/app/api/auth/webauthn/authenticate/options/route';

describe('webauthn api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDocs.mockResolvedValue({ docs: [] });
  });

  it('creates registration challenge', async () => {
    const req = new NextRequest('http://localhost/api/auth/webauthn/register/options', { method: 'POST', body: JSON.stringify({ tenantId: 't1' }), headers: { Authorization: 'Bearer x' } });
    const res = await registerOptionsPost(req);
    expect(res.status).toBe(200);
    expect(mockSetDoc).toHaveBeenCalled();
  });

  it('creates auth challenge', async () => {
    const req = new NextRequest('http://localhost/api/auth/webauthn/authenticate/options', { method: 'POST', body: JSON.stringify({ tenantId: 't1' }), headers: { Authorization: 'Bearer x' } });
    const res = await authOptionsPost(req);
    expect(res.status).toBe(200);
    expect(mockSetDoc).toHaveBeenCalled();
  });
});
