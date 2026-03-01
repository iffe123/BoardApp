import { NextRequest, NextResponse } from 'next/server';
import { addDoc, getDocs, query, where } from 'firebase/firestore';
import { verifySession, verifyTenantAccess, authErrorResponse, AuthError } from '@/lib/auth/verify-session';
import { collections, Timestamp } from '@/lib/firebase';
import { createBulkNotifications } from '@/lib/notification-service';
import { sendEmail } from '@/lib/email-service';
import { getMeetingWithMember, isMinutesEditor } from '@/lib/minutes-review-service';
import type { MinutesReview, User } from '@/types/schema';

export async function POST(request: NextRequest, { params }: { params: { meetingId: string } }) {
  try {
    const { user } = await verifySession(request);
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    if (!tenantId) return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });

    await verifyTenantAccess(user, tenantId);

    const body = await request.json();
    const reviewers = Array.isArray(body.reviewers) ? body.reviewers : [];
    if (reviewers.length === 0) {
      return NextResponse.json({ error: 'reviewers is required' }, { status: 400 });
    }

    const { meeting, member } = await getMeetingWithMember(tenantId, params.meetingId, user.uid);
    if (!isMinutesEditor(meeting, member)) {
      return NextResponse.json({ error: 'Only minutes editors can request review' }, { status: 403 });
    }

    const reviewData: Omit<MinutesReview, 'id'> = {
      tenantId,
      meetingId: params.meetingId,
      status: 'in_review',
      requestedByUserId: user.uid,
      requestedAt: Timestamp.now(),
      reviewers: reviewers.map((reviewerId: string) => ({ userId: reviewerId, status: 'pending' })),
    };

    const reviewRef = await addDoc(collections.minutesReviews(tenantId, params.meetingId), reviewData);

    const href = `/dashboard/${tenantId}/meetings/${params.meetingId}?tab=minutes&review=1`;
    await createBulkNotifications(reviewers, {
      tenantId,
      type: 'minutes_review_requested',
      title: 'Kommentarer begärda för protokoll',
      body: `${meeting.title}: Granska mötesprotokollet och lämna kommentarer.`,
      resourceType: 'meeting_minutes',
      resourceId: params.meetingId,
      resourceUrl: href,
      deliveredVia: ['in_app', 'email'],
    });

    const usersSnap = await getDocs(query(collections.users(), where('__name__', 'in', reviewers.slice(0, 10))));
    const users = usersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as User[];
    await Promise.all(
      users.map((reviewer) =>
        sendEmail({
          to: { email: reviewer.email, name: reviewer.displayName },
          subject: `Review requested: ${meeting.title}`,
          html: `<p>Hej ${reviewer.displayName || ''},</p><p>Du har blivit ombedd att granska protokollet för <strong>${meeting.title}</strong>.</p><p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${href}">Öppna protokoll</a></p>`,
        })
      )
    );

    return NextResponse.json({ reviewId: reviewRef.id });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to request review' }, { status: 500 });
  }
}
