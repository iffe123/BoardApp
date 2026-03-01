import { NextRequest, NextResponse } from 'next/server';
import { getDoc, updateDoc } from 'firebase/firestore';
import { verifySession, verifyTenantAccess, authErrorResponse, AuthError } from '@/lib/auth/verify-session';
import { collections, Timestamp } from '@/lib/firebase';
import { getMeetingWithMember, isMinutesEditor } from '@/lib/minutes-review-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { meetingId: string; commentId: string } }
) {
  try {
    const { user } = await verifySession(request);
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    if (!tenantId) return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });

    await verifyTenantAccess(user, tenantId);
    const { meeting, member } = await getMeetingWithMember(tenantId, params.meetingId, user.uid);
    if (!isMinutesEditor(meeting, member)) {
      return NextResponse.json({ error: 'Only minutes editors can resolve comments' }, { status: 403 });
    }

    const commentRef = collections.minutesComment(tenantId, params.meetingId, params.commentId);
    const commentSnap = await getDoc(commentRef);
    if (!commentSnap.exists()) return NextResponse.json({ error: 'Comment not found' }, { status: 404 });

    await updateDoc(commentRef, { resolvedAt: Timestamp.now(), resolvedByUserId: user.uid });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to resolve comment' }, { status: 500 });
  }
}
