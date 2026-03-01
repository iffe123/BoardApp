import { NextRequest, NextResponse } from 'next/server';
import { addDoc, getDocs, orderBy, query, updateDoc } from 'firebase/firestore';
import { verifySession, verifyTenantAccess, authErrorResponse, AuthError } from '@/lib/auth/verify-session';
import { collections, Timestamp } from '@/lib/firebase';
import { getMeetingWithMember, isMeetingMember } from '@/lib/minutes-review-service';
import type { MinutesComment, MinutesReview } from '@/types/schema';

export async function GET(request: NextRequest, { params }: { params: { meetingId: string } }) {
  try {
    const { user } = await verifySession(request);
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    if (!tenantId) return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });

    await verifyTenantAccess(user, tenantId);
    const { meeting } = await getMeetingWithMember(tenantId, params.meetingId, user.uid);
    if (!isMeetingMember(meeting, user.uid)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const agendaItemId = searchParams.get('agendaItemId');
    const snapshot = await getDocs(query(collections.minutesComments(tenantId, params.meetingId), orderBy('createdAt', 'asc')));
    const comments = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as MinutesComment[];
    return NextResponse.json({ comments: agendaItemId ? comments.filter((c) => c.agendaItemId === agendaItemId) : comments });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to fetch comments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { meetingId: string } }) {
  try {
    const { user } = await verifySession(request);
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    if (!tenantId) return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    await verifyTenantAccess(user, tenantId);

    const { meeting } = await getMeetingWithMember(tenantId, params.meetingId, user.uid);
    if (!isMeetingMember(meeting, user.uid)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    if (!body.agendaItemId || !body.content) {
      return NextResponse.json({ error: 'agendaItemId and content are required' }, { status: 400 });
    }

    const commentData: Omit<MinutesComment, 'id'> = {
      tenantId,
      meetingId: params.meetingId,
      agendaItemId: body.agendaItemId,
      authorId: user.uid,
      authorName: user.name || user.email || 'Reviewer',
      content: body.content,
      type: body.type === 'change_request' ? 'change_request' : 'comment',
      createdAt: Timestamp.now(),
    };

    const docRef = await addDoc(collections.minutesComments(tenantId, params.meetingId), commentData);

    if (commentData.type === 'change_request') {
      const reviewsSnap = await getDocs(query(collections.minutesReviews(tenantId, params.meetingId), orderBy('requestedAt', 'desc')));
      const latestReview = reviewsSnap.docs[0];
      if (latestReview) {
        const review = latestReview.data() as MinutesReview;
        if (review.status === 'in_review') {
          await updateDoc(latestReview.ref, { status: 'changes_requested' });
        }
      }
    }

    return NextResponse.json({ id: docRef.id, ...commentData });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to add comment' }, { status: 500 });
  }
}
