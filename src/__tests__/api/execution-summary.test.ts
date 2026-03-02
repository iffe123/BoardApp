import { NextRequest, NextResponse } from 'next/server';

jest.mock('@/lib/auth/verify-session', () => {
  return {
    verifySession: jest.fn().mockResolvedValue({ user: { uid: 'u1', tenants: { t1: 'admin' } } }),
    verifyTenantAccess: jest.fn(),
    authErrorResponse: jest.fn().mockImplementation((error: Error) => NextResponse.json({ error: error.message }, { status: 401 })),
    AuthError: class extends Error {},
  };
});

jest.mock('@/lib/logger', () => ({ logger: { error: jest.fn() } }));

jest.mock('@/lib/firebase', () => ({
  collections: {
    decisions: jest.fn(() => ({ path: 'decisions' })),
    actions: jest.fn(() => ({ path: 'actions' })),
  },
}));

const mockGetDocs = jest.fn();
jest.mock('firebase/firestore', () => ({
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
}));

import { GET } from '@/app/api/execution/summary/route';

describe('GET /api/execution/summary', () => {
  beforeEach(() => jest.clearAllMocks());

  it('computes execution metrics including overdue and board promises', async () => {
    const decisionsSnap = {
      docs: [
        {
          id: 'd1',
          data: () => ({ id: 'd1', title: 'Decision 1', decidedAt: { toDate: () => new Date() }, impactCategory: 'finance' }),
        },
        {
          id: 'd2',
          data: () => ({ id: 'd2', title: 'Decision 2', decidedAt: { toDate: () => new Date() }, impactCategory: 'risk' }),
        },
      ],
    };

    const actionsSnap = {
      docs: [
        {
          id: 'a1',
          data: () => ({
            tenantId: 't1',
            decisionId: 'd1',
            ownerUserId: 'owner-1',
            title: 'Do it',
            dueDate: { toDate: () => new Date(Date.now() - 86400000) },
            status: 'open',
            createdAt: { toDate: () => new Date(Date.now() - 172800000) },
          }),
        },
      ],
    };

    mockGetDocs.mockResolvedValueOnce(decisionsSnap).mockResolvedValueOnce(actionsSnap);

    const response = await GET(new NextRequest('http://localhost/api/execution/summary?tenantId=t1'));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.totalDecisionsLast12Months).toBe(2);
    expect(json.overdueCount).toBe(1);
    expect(json.openActionsCount).toBe(0);
    expect(json.boardPromises).toHaveLength(1);
    expect(json.boardPromises[0].decisionId).toBe('d2');
  });
});
