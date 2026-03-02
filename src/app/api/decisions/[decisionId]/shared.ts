import { NextRequest, NextResponse } from 'next/server';
import { getDoc } from 'firebase/firestore';
import { collections } from '@/lib/firebase';
import { verifySession, verifyTenantAccess, authErrorResponse, AuthError } from '@/lib/auth/verify-session';
import type { Decision, Meeting, Member } from '@/types/schema';

export interface DecisionRouteContext {
  user: { uid: string; name?: string; email?: string; tenants?: Record<string, string> };
  tenantId: string;
  decisionId: string;
  decision: Decision;
  meeting: Meeting;
  member: Member;
}

export async function loadDecisionContext(request: NextRequest, decisionId: string): Promise<DecisionRouteContext | NextResponse> {
  try {
    const { user } = await verifySession(request);
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    await verifyTenantAccess(user, tenantId);

    const decisionSnap = await getDoc(collections.decision(tenantId, decisionId));
    if (!decisionSnap.exists()) {
      return NextResponse.json({ error: 'Decision not found' }, { status: 404 });
    }

    const decision = { id: decisionSnap.id, ...decisionSnap.data() } as Decision;
    const meetingSnap = await getDoc(collections.meeting(tenantId, decision.meetingId));
    if (!meetingSnap.exists()) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    const memberSnap = await getDoc(collections.member(tenantId, user.uid));
    if (!memberSnap.exists()) {
      return NextResponse.json({ error: 'Only meeting members can vote' }, { status: 403 });
    }

    const member = { id: memberSnap.id, ...memberSnap.data() } as Member;
    const meeting = { id: meetingSnap.id, ...meetingSnap.data() } as Meeting;

    return { user, tenantId, decisionId, decision, meeting, member };
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    throw error;
  }
}

export function isDecisionContextResponse(
  value: DecisionRouteContext | NextResponse
): value is NextResponse {
  return value instanceof NextResponse;
}
