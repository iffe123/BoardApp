import { NextRequest, NextResponse } from 'next/server';

const mockGetDocs = jest.fn();
const mockUpdateDoc = jest.fn();
const mockCreateAuditLog = jest.fn();
const mockLoadDecisionContext = jest.fn();

jest.mock('firebase/firestore', () => ({
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
}));

jest.mock('@/lib/audit-service', () => ({
  createAuditLog: (...args: unknown[]) => mockCreateAuditLog(...args),
}));

jest.mock('@/lib/firebase', () => ({
  Timestamp: { now: jest.fn(() => ({ toDate: () => new Date('2024-01-01T00:00:00Z') })) },
  collections: {
    decision: jest.fn(() => ({ path: 'decision-ref' })),
    meetingDecisionVotes: jest.fn(() => ({ path: 'votes-ref' })),
  },
}));

jest.mock('@/app/api/decisions/[decisionId]/shared', () => ({
  loadDecisionContext: (...args: unknown[]) => mockLoadDecisionContext(...args),
  isDecisionContextResponse: (value: unknown) => value instanceof NextResponse,
}));

import { POST } from '@/app/api/decisions/[decisionId]/close/route';

const baseContext = {
  user: { uid: 'chair-user', name: 'Chair User' },
  member: { role: 'chair' },
  tenantId: 'tenant-1',
  decisionId: 'decision-1',
  decision: {
    voting: { enabled: true, status: 'open', type: 'majority' as const, quorumRequired: 2 },
  },
  meeting: {
    id: 'meeting-1',
    attendees: [
      { userId: 'u1', hasVotingRights: true },
      { userId: 'u2', hasVotingRights: true },
      { userId: 'u3', hasVotingRights: true },
    ],
  },
};

describe('Decision voting close API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateAuditLog.mockResolvedValue('audit-1');
    mockUpdateDoc.mockResolvedValue(undefined);
  });

  it('computes majority approval', async () => {
    mockLoadDecisionContext.mockResolvedValue(baseContext);
    mockGetDocs.mockResolvedValue({ docs: [{ data: () => ({ vote: 'for' }) }, { data: () => ({ vote: 'for' }) }, { data: () => ({ vote: 'against' }) }] });

    const response = await POST(new NextRequest('http://localhost/api/decisions/decision-1/close?tenantId=tenant-1', { method: 'POST' }), { params: { decisionId: 'decision-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.result).toBe('approved');
  });

  it('computes unanimous rejection when against exists', async () => {
    mockLoadDecisionContext.mockResolvedValue({
      ...baseContext,
      decision: { voting: { enabled: true, status: 'open', type: 'unanimous' as const, quorumRequired: 2 } },
    });
    mockGetDocs.mockResolvedValue({ docs: [{ data: () => ({ vote: 'for' }) }, { data: () => ({ vote: 'against' }) }] });

    const response = await POST(new NextRequest('http://localhost/api/decisions/decision-1/close?tenantId=tenant-1', { method: 'POST' }), { params: { decisionId: 'decision-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.result).toBe('rejected');
  });

  it('rejects when quorum is not met', async () => {
    mockLoadDecisionContext.mockResolvedValue({
      ...baseContext,
      decision: { voting: { enabled: true, status: 'open', type: 'majority' as const, quorumRequired: 3 } },
    });
    mockGetDocs.mockResolvedValue({ docs: [{ data: () => ({ vote: 'for' }) }, { data: () => ({ vote: 'for' }) }] });

    const response = await POST(new NextRequest('http://localhost/api/decisions/decision-1/close?tenantId=tenant-1', { method: 'POST' }), { params: { decisionId: 'decision-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.quorum.achieved).toBe(false);
    expect(data.result).toBe('rejected');
  });
});
