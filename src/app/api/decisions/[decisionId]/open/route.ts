import { NextRequest, NextResponse } from 'next/server';
import { updateDoc } from 'firebase/firestore';
import { Timestamp, collections } from '@/lib/firebase';
import { createAuditLog } from '@/lib/audit-service';
import { loadDecisionContext, isDecisionContextResponse } from '../shared';

interface RouteParams { params: { decisionId: string } }

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await loadDecisionContext(request, params.decisionId);
    if (isDecisionContextResponse(context)) return context;

    const { user, member, tenantId, decisionId } = context;
    if (!['chair', 'admin', 'owner'].includes(member.role)) {
      return NextResponse.json({ error: 'Only chair/admin can open voting' }, { status: 403 });
    }

    const currentVoting = context.decision.voting || {
      enabled: true,
      type: 'majority' as const,
      status: 'draft' as const,
    };

    if (!currentVoting.enabled) {
      return NextResponse.json({ error: 'Voting is not enabled for this decision' }, { status: 400 });
    }

    if (currentVoting.status === 'closed') {
      return NextResponse.json({ error: 'Voting is already closed' }, { status: 400 });
    }

    await updateDoc(collections.decision(tenantId, decisionId), {
      voting: {
        ...currentVoting,
        status: 'open',
        openedAt: Timestamp.now(),
      },
      updatedAt: Timestamp.now(),
    });

    await createAuditLog({
      tenantId,
      action: 'decision.vote_opened',
      resourceType: 'decision',
      resourceId: decisionId,
      actorId: user.uid,
      actorName: user.name || user.email || 'Unknown',
      metadata: { previousStatus: currentVoting.status },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error opening vote', error);
    return NextResponse.json({ error: 'Failed to open voting' }, { status: 500 });
  }
}
