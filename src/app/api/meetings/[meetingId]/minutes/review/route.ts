import { NextRequest, NextResponse } from 'next/server';
import { getDocs, orderBy, query } from 'firebase/firestore';
import { verifySession, verifyTenantAccess, authErrorResponse, AuthError } from '@/lib/auth/verify-session';
import { collections } from '@/lib/firebase';
import { getMeetingWithMember, isMeetingMember } from '@/lib/minutes-review-service';
import type { MinutesReview } from '@/types/schema';

export async function GET(request: NextRequest, { params }: { params: { meetingId: string } }) {
  try {
    const { user } = await verifySession(request);
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    if (!tenantId) return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });

    await verifyTenantAccess(user, tenantId);
    const { meeting } = await getMeetingWithMember(tenantId, params.meetingId, user.uid);
    if (!isMeetingMember(meeting, user.uid)) {
      return NextResponse.json({ error: 'Only meeting members can view reviews' }, { status: 403 });
    }

    const snapshot = await getDocs(query(collections.minutesReviews(tenantId, params.meetingId), orderBy('requestedAt', 'desc')));
    const reviews = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as MinutesReview[];
    return NextResponse.json({ reviews, activeReview: reviews.find((r) => r.status !== 'closed') || null });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to fetch review' }, { status: 500 });
  }
}
