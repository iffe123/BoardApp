import { NextRequest, NextResponse } from 'next/server';
import { getDoc, setDoc } from 'firebase/firestore';
import { Timestamp, collections } from '@/lib/firebase';
import { createAuditLog } from '@/lib/audit-service';
import type { DecisionVote } from '@/types/schema';
import { loadDecisionContext, isDecisionContextResponse } from '../shared';

interface RouteParams { params: { decisionId: string } }

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await loadDecisionContext(request, params.decisionId);
    if (isDecisionContextResponse(context)) return context;

    const { user, tenantId, decisionId, decision, meeting } = context;

    const body = await request.json();
    const voteValue = body.vote as 'for' | 'against' | 'abstain';
    const comment = body.comment as string | undefined;

    if (!['for', 'against', 'abstain'].includes(voteValue)) {
      return NextResponse.json({ error: 'Invalid vote value' }, { status: 400 });
    }

    if (!decision.voting?.enabled) {
      return NextResponse.json({ error: 'Voting is not enabled for this decision' }, { status: 400 });
    }

    if (decision.voting.status !== 'open') {
      return NextResponse.json({ error: 'Voting is not open' }, { status: 400 });
    }

    const attendee = meeting.attendees.find((entry) => entry.userId === user.uid);
    if (!attendee || !attendee.hasVotingRights) {
      return NextResponse.json({ error: 'Only meeting members can vote' }, { status: 403 });
    }

    const voteRef = collections.meetingDecisionVote(tenantId, meeting.id, decisionId, user.uid);
    const existingVote = await getDoc(voteRef);
    if (existingVote.exists()) {
      return NextResponse.json({ idempotent: true, message: 'Vote already recorded' }, { status: 200 });
    }

    const voteRecord: Omit<DecisionVote, 'id'> = {
      userId: user.uid,
      vote: voteValue,
      votedAt: Timestamp.now(),
      weight: typeof body.weight === 'number' ? body.weight : undefined,
      comment,
    };

    await setDoc(voteRef, voteRecord);

    await createAuditLog({
      tenantId,
      action: 'decision.vote_cast',
      resourceType: 'decision',
      resourceId: decisionId,
      actorId: user.uid,
      actorName: user.name || user.email || 'Unknown',
      metadata: { meetingId: meeting.id, vote: voteValue },
    });

    return NextResponse.json({ success: true, vote: voteRecord });
  } catch (error) {
    console.error('Error casting vote', error);
    return NextResponse.json({ error: 'Failed to cast vote' }, { status: 500 });
  }
}
