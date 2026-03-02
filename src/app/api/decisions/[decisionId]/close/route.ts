import { NextRequest, NextResponse } from 'next/server';
import { getDocs, updateDoc } from 'firebase/firestore';
import { Timestamp, collections } from '@/lib/firebase';
import { createAuditLog } from '@/lib/audit-service';
import { computeVotingResult, resolveQuorum, tallyVotes } from '@/lib/decision-voting';
import { loadDecisionContext, isDecisionContextResponse } from '../shared';

interface RouteParams { params: { decisionId: string } }

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await loadDecisionContext(request, params.decisionId);
    if (isDecisionContextResponse(context)) return context;

    const { user, member, tenantId, decisionId, decision, meeting } = context;
    if (!['chair', 'admin', 'owner'].includes(member.role)) {
      return NextResponse.json({ error: 'Only chair/admin can close voting' }, { status: 403 });
    }

    if (!decision.voting?.enabled) {
      return NextResponse.json({ error: 'Voting is not enabled for this decision' }, { status: 400 });
    }

    if (decision.voting.status !== 'open') {
      return NextResponse.json({ error: 'Voting is not open' }, { status: 400 });
    }

    const votesSnapshot = await getDocs(collections.meetingDecisionVotes(tenantId, meeting.id, decisionId));
    const votes = votesSnapshot.docs.map((doc) => doc.data() as { vote: 'for' | 'against' | 'abstain' });
    const tally = tallyVotes(votes);

    const eligibleCount = meeting.attendees.filter((a) => a.hasVotingRights).length;
    const quorum = resolveQuorum(decision.voting.quorumRequired, eligibleCount, tally.totalVotes);
    const result = quorum.achieved
      ? computeVotingResult(decision.voting.type, tally, decision.voting.customThreshold)
      : 'rejected';

    await updateDoc(collections.decision(tenantId, decisionId), {
      votesFor: tally.votesFor,
      votesAgainst: tally.votesAgainst,
      abstentions: tally.abstentions,
      outcome: result,
      voting: {
        ...decision.voting,
        status: 'closed',
        closedAt: Timestamp.now(),
        result,
      },
      updatedAt: Timestamp.now(),
    });

    await createAuditLog({
      tenantId,
      action: 'decision.vote_closed',
      resourceType: 'decision',
      resourceId: decisionId,
      actorId: user.uid,
      actorName: user.name || user.email || 'Unknown',
      metadata: {
        quorumRequired: decision.voting.quorumRequired,
        quorumMet: quorum.achieved,
        quorumRequiredCount: quorum.requiredCount,
        tally,
        result,
      },
    });

    return NextResponse.json({ success: true, tally, quorum, result });
  } catch (error) {
    console.error('Error closing vote', error);
    return NextResponse.json({ error: 'Failed to close voting' }, { status: 500 });
  }
}
