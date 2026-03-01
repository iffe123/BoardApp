import { NextRequest, NextResponse } from 'next/server';
import { verifySession, verifyTenantAccess, authErrorResponse, AuthError } from '@/lib/auth/verify-session';
import { collections, Timestamp } from '@/lib/firebase';
import { addDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { buildCalendarFeedUrls, generateCalendarToken, hashCalendarToken } from '@/lib/calendar-subscription-service';
import { logger } from '@/lib/logger';
import type { CalendarSubscription } from '@/types/schema';

export async function POST(request: NextRequest) {
  try {
    const { user } = await verifySession(request);
    const body = await request.json();
    const tenantId = body.tenantId as string | undefined;
    const scope = (body.scope as CalendarSubscription['scope'] | undefined) || 'tenant';
    const boardroomId = body.boardroomId as string | undefined;

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    if (scope === 'boardroom' && !boardroomId) {
      return NextResponse.json({ error: 'boardroomId is required for boardroom scope' }, { status: 400 });
    }

    await verifyTenantAccess(user, tenantId);

    const existingSnapshot = await getDocs(
      query(
        collections.calendarSubscriptions(tenantId),
        where('userId', '==', user.uid),
        where('scope', '==', scope),
        where('revokedAt', '==', null)
      )
    );

    const matchingSubscription = existingSnapshot.docs.find((doc) => {
      const data = doc.data() as CalendarSubscription;
      return scope === 'tenant' || data.boardroomId === boardroomId;
    });

    if (matchingSubscription) {
      await updateDoc(matchingSubscription.ref, {
        revokedAt: Timestamp.now(),
        rotatedAt: Timestamp.now(),
      });
    }

    const token = generateCalendarToken();
    const tokenHash = hashCalendarToken(token);

    await addDoc(collections.calendarSubscriptions(tenantId), {
      tenantId,
      userId: user.uid,
      scope,
      boardroomId: boardroomId || null,
      tokenHash,
      createdAt: Timestamp.now(),
      rotatedAt: Timestamp.now(),
      revokedAt: null,
    });

    return NextResponse.json({
      token,
      ...buildCalendarFeedUrls(token),
      scope,
      boardroomId: boardroomId || null,
    });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    logger.error('Error rotating calendar subscription', error);
    return NextResponse.json({ error: 'Failed to rotate calendar subscription' }, { status: 500 });
  }
}
