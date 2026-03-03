import { NextRequest, NextResponse } from 'next/server';
import { getDoc, updateDoc } from 'firebase/firestore';
import { verifySession, verifyTenantAccess, authErrorResponse, AuthError } from '@/lib/auth/verify-session';
import { collections, Timestamp } from '@/lib/firebase';
import { updateReviewStatusAfterApproval } from '@/lib/minutes-review-service';
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
    const targetReviewer = review.reviewers.find((r) => r.userId === user.uid);
    if (!targetReviewer) return NextResponse.json({ error: 'Only reviewers can approve' }, { status: 403 });

    const updatedReviewers = review.reviewers.map((reviewer) =>
      reviewer.userId === user.uid ? { ...reviewer, status: 'approved' as const, respondedAt: Timestamp.now() } : reviewer
    );

    const status = updateReviewStatusAfterApproval(review.status, updatedReviewers.map((r) => r.status) as Array<'pending' | 'approved' | 'changes_requested'>);

    await updateDoc(reviewRef, {
      reviewers: updatedReviewers,
      status,
    });

    return NextResponse.json({ success: true, status });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to approve review' }, { status: 500 });
  }
}
