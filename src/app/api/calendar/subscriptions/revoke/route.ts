import { NextRequest, NextResponse } from 'next/server';
import { verifySession, verifyTenantAccess, authErrorResponse, AuthError } from '@/lib/auth/verify-session';
import { collections, Timestamp } from '@/lib/firebase';
import { getDocs, query, updateDoc, where } from 'firebase/firestore';
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

    await verifyTenantAccess(user, tenantId);

    const existingSnapshot = await getDocs(
      query(
        collections.calendarSubscriptions(tenantId),
        where('userId', '==', user.uid),
        where('scope', '==', scope),
        where('revokedAt', '==', null)
      )
    );

    const matchingDocs = existingSnapshot.docs.filter((doc) => {
      const data = doc.data() as CalendarSubscription;
      return scope === 'tenant' || data.boardroomId === boardroomId;
    });

    await Promise.all(matchingDocs.map((doc) => updateDoc(doc.ref, { revokedAt: Timestamp.now() })));

    return NextResponse.json({ revoked: matchingDocs.length });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    logger.error('Error revoking calendar subscription', error);
    return NextResponse.json({ error: 'Failed to revoke calendar subscription' }, { status: 500 });
  }
}
