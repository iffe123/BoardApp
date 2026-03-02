import { NextRequest, NextResponse } from 'next/server';

const store = {
  decision: {
    id: 'decision-1',
    meetingId: 'meeting-1',
    outcome: 'pending',
    votesFor: 0,
    votesAgainst: 0,
    abstentions: 0,
    voting: { enabled: true, status: 'draft', type: 'majority' as const, quorumRequired: 2 },
  },
  meeting: {
    id: 'meeting-1',
    attendees: [
      { userId: 'chair-user', hasVotingRights: true },
      { userId: 'member-a', hasVotingRights: true },
      { userId: 'member-b', hasVotingRights: true },
    ],
  },
  votes: new Map<string, { vote: 'for' | 'against' | 'abstain' }>(),
};

let actingUser = { uid: 'chair-user', name: 'Chair', email: 'chair@test.com' };

jest.mock('@/lib/firebase', () => ({
  Timestamp: { now: jest.fn(() => ({ toDate: () => new Date('2024-01-01T00:00:00Z') })) },
  collections: {
    decision: jest.fn(() => 'decision-ref'),
    meetingDecisionVote: jest.fn((tenantId: string, meetingId: string, decisionId: string, voteId: string) => ({ voteId })),
    meetingDecisionVotes: jest.fn(() => 'votes-ref'),
  },
}));

jest.mock('firebase/firestore', () => ({
  getDoc: jest.fn((ref: { voteId?: string }) => ({ exists: () => !!ref.voteId && store.votes.has(ref.voteId), data: () => ref.voteId ? store.votes.get(ref.voteId) : null })),
  setDoc: jest.fn((ref: { voteId: string }, data: { vote: 'for' | 'against' | 'abstain' }) => { store.votes.set(ref.voteId, data); }),
  getDocs: jest.fn(() => ({ docs: Array.from(store.votes.values()).map((vote) => ({ data: () => vote })) })),
  updateDoc: jest.fn((_ref: string, data: Record<string, unknown>) => {
    if (data.voting) store.decision.voting = data.voting as typeof store.decision.voting;
    if (typeof data.votesFor === 'number') store.decision.votesFor = data.votesFor;
    if (typeof data.votesAgainst === 'number') store.decision.votesAgainst = data.votesAgainst;
    if (typeof data.abstentions === 'number') store.decision.abstentions = data.abstentions;
    if (typeof data.outcome === 'string') store.decision.outcome = data.outcome;
  }),
}));

jest.mock('@/lib/audit-service', () => ({ createAuditLog: jest.fn().mockResolvedValue('audit-id') }));

jest.mock('@/app/api/decisions/[decisionId]/shared', () => ({
  loadDecisionContext: jest.fn(() => ({
    user: actingUser,
    member: { role: actingUser.uid === 'chair-user' ? 'chair' : 'director' },
    tenantId: 'tenant-1',
    decisionId: 'decision-1',
    decision: store.decision,
    meeting: store.meeting,
  })),
  isDecisionContextResponse: (value: unknown) => value instanceof NextResponse,
}));

import { POST as openVoting } from '@/app/api/decisions/[decisionId]/open/route';
import { POST as castVote } from '@/app/api/decisions/[decisionId]/vote/route';
import { POST as closeVoting } from '@/app/api/decisions/[decisionId]/close/route';

describe('Decision voting lifecycle', () => {
  beforeEach(() => {
    store.votes.clear();
    store.decision.votesFor = 0;
    store.decision.votesAgainst = 0;
    store.decision.abstentions = 0;
    store.decision.outcome = 'pending';
    store.decision.voting = { enabled: true, status: 'draft', type: 'majority', quorumRequired: 2 };
  });

  it('create decision -> open voting -> 2 users vote -> close -> result stored', async () => {
    const req = new NextRequest('http://localhost/api/decisions/decision-1/open?tenantId=tenant-1', { method: 'POST' });
    expect((await openVoting(req, { params: { decisionId: 'decision-1' } })).status).toBe(200);

    actingUser = { uid: 'member-a', name: 'Member A', email: 'a@test.com' };
    expect((await castVote(new NextRequest('http://localhost/api/decisions/decision-1/vote?tenantId=tenant-1', { method: 'POST', body: JSON.stringify({ vote: 'for' }) }), { params: { decisionId: 'decision-1' } })).status).toBe(200);

    actingUser = { uid: 'member-b', name: 'Member B', email: 'b@test.com' };
    expect((await castVote(new NextRequest('http://localhost/api/decisions/decision-1/vote?tenantId=tenant-1', { method: 'POST', body: JSON.stringify({ vote: 'for' }) }), { params: { decisionId: 'decision-1' } })).status).toBe(200);

    actingUser = { uid: 'chair-user', name: 'Chair', email: 'chair@test.com' };
    const closeResponse = await closeVoting(new NextRequest('http://localhost/api/decisions/decision-1/close?tenantId=tenant-1', { method: 'POST' }), { params: { decisionId: 'decision-1' } });

    expect(closeResponse.status).toBe(200);
    expect(store.decision.voting.status).toBe('closed');
    expect(store.decision.outcome).toBe('approved');
    expect(store.decision.votesFor).toBe(2);
  });
});
