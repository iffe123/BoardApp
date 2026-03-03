import { NextRequest, NextResponse } from 'next/server';
import { getDocs } from 'firebase/firestore';
import { verifySession, verifyTenantAccess, authErrorResponse, AuthError } from '@/lib/auth/verify-session';
import { collections } from '@/lib/firebase';
import { logger } from '@/lib/logger';
import type { Decision } from '@/types/schema';
import { computeExecutionSummary, type ExecutionActionItem, type ExecutionActionStatus } from '@/lib/execution';
import type { Timestamp } from 'firebase/firestore';

interface ExecutionAction {
  tenantId: string;
  decisionId: string;
  ownerUserId: string;
  title: string;
  description: string;
  dueDate: Timestamp;
  status: ExecutionActionStatus;
  completionPercentage: number;
  createdAt: Timestamp;
  completedAt?: Timestamp;
}

export async function GET(request: NextRequest) {
  try {
    const { user } = await verifySession(request);
    const tenantId = new URL(request.url).searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    await verifyTenantAccess(user, tenantId);

    const [decisionsSnap, actionsSnap] = await Promise.all([
      getDocs(collections.decisions(tenantId)),
      getDocs(collections.actions(tenantId)),
    ]);

    const decisions: Decision[] = decisionsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Decision));
    const actions: ExecutionActionItem[] = actionsSnap.docs.map((doc) => {
      const data = doc.data() as ExecutionAction;
      return {
        id: doc.id,
        tenantId: data.tenantId,
        decisionId: data.decisionId,
        ownerUserId: data.ownerUserId,
        title: data.title,
        description: data.description,
        dueDate: data.dueDate.toDate(),
        status: data.status,
        completionPercentage: data.completionPercentage,
        createdAt: data.createdAt.toDate(),
        completedAt: data.completedAt?.toDate(),
      };
    });

    const summary = computeExecutionSummary(decisions, actions);

    return NextResponse.json(summary);
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    logger.error('Error computing execution summary', error);
    return NextResponse.json({ error: 'Failed to compute execution summary' }, { status: 500 });
  }
}
