import { NextRequest, NextResponse } from 'next/server';
import { getDoc, updateDoc } from 'firebase/firestore';
import { verifySession, verifyTenantAccess, authErrorResponse, AuthError } from '@/lib/auth/verify-session';
import { collections, Timestamp } from '@/lib/firebase';
import { createNotification } from '@/lib/notification-service';
import type { MinutesReview } from '@/types/schema';

export async function POST(
  request: NextRequest,
  { params }: { params: { meetingId: string; reviewId: string } }
) {
  try {
    const { user } = await verifySession(request);
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    if (!tenantId) return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    await verifyTenantAccess(user, tenantId);

    const reviewRef = collections.minutesReview(tenantId, params.meetingId, params.reviewId);
    const reviewSnap = await getDoc(reviewRef);
    if (!reviewSnap.exists()) return NextResponse.json({ error: 'Review not found' }, { status: 404 });

    const review = reviewSnap.data() as MinutesReview;
    const isReviewer = review.reviewers.some((reviewer) => reviewer.userId === user.uid);
    if (!isReviewer) return NextResponse.json({ error: 'Only reviewers can request changes' }, { status: 403 });

    const updatedReviewers = review.reviewers.map((reviewer) =>
      reviewer.userId === user.uid
        ? { ...reviewer, status: 'changes_requested', respondedAt: Timestamp.now() }
        : reviewer
    );

    await updateDoc(reviewRef, {
      reviewers: updatedReviewers,
      status: 'changes_requested',
    });

    if (review.requestedByUserId && review.requestedByUserId !== user.uid) {
      await createNotification({
        tenantId,
        userId: review.requestedByUserId,
        type: 'minutes_review_changes_requested',
        title: 'Ändringar begärda i protokoll',
        body: 'En granskare har begärt ändringar i mötesprotokollet.',
        resourceType: 'meeting_minutes',
        resourceId: params.meetingId,
        resourceUrl: `/dashboard/${tenantId}/meetings/${params.meetingId}?tab=minutes&review=1`,
      });
    }

    return NextResponse.json({ success: true, status: 'changes_requested' });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to request changes' }, { status: 500 });
  }
}
