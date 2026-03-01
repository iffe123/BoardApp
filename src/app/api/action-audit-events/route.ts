import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { verifySession, verifyTenantAccess, authErrorResponse, AuthError } from '@/lib/auth/verify-session';
import { collections, Timestamp, setDoc, doc } from '@/lib/firebase';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const { user } = await verifySession(request);
    const body = await request.json();

    const { tenantId, action, status, message, metadata } = body;

    if (!tenantId || !action || !status || !message) {
      return NextResponse.json(
        { error: 'tenantId, action, status and message are required' },
        { status: 400 }
      );
    }

    await verifyTenantAccess(user, tenantId);

    const eventId = uuidv4();
    const ref = doc(collections.actionAuditEvents(tenantId), eventId);
    await setDoc(ref, {
      id: eventId,
      tenantId,
      action,
      status,
      message,
      metadata: metadata || {},
      userId: user.uid,
      createdAt: Timestamp.now(),
    });

    return NextResponse.json({ ok: true, eventId }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    logger.error('Failed to store action audit event', error);
    return NextResponse.json({ error: 'Failed to store action audit event' }, { status: 500 });
  }
}
