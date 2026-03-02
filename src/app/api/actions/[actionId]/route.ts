import { NextRequest, NextResponse } from 'next/server';
import { getDoc, updateDoc } from 'firebase/firestore';
import { verifySession, verifyTenantAccess, authErrorResponse, AuthError } from '@/lib/auth/verify-session';
import { collections, Timestamp } from '@/lib/firebase';
import { logger } from '@/lib/logger';

export async function PATCH(request: NextRequest, { params }: { params: { actionId: string } }) {
  try {
    const { user } = await verifySession(request);
    const actionId = params.actionId;
    const body = await request.json();
    const { tenantId, status, completionPercentage, dueDate, title, description, ownerUserId } = body;

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    await verifyTenantAccess(user, tenantId);

    const actionRef = collections.action(tenantId, actionId);
    const existing = await getDoc(actionRef);
    if (!existing.exists()) {
      return NextResponse.json({ error: 'Action not found' }, { status: 404 });
    }

    const updatePayload: Record<string, unknown> = {};
    if (typeof status === 'string') updatePayload.status = status;
    if (typeof completionPercentage === 'number') updatePayload.completionPercentage = Math.min(100, Math.max(0, completionPercentage));
    if (typeof dueDate === 'string') updatePayload.dueDate = Timestamp.fromDate(new Date(dueDate));
    if (typeof title === 'string') updatePayload.title = title;
    if (typeof description === 'string') updatePayload.description = description;
    if (typeof ownerUserId === 'string') updatePayload.ownerUserId = ownerUserId;

    if (status === 'done') {
      updatePayload.completedAt = Timestamp.now();
      if (updatePayload.completionPercentage === undefined) updatePayload.completionPercentage = 100;
    }

    await updateDoc(actionRef, updatePayload);

    return NextResponse.json({ success: true, id: actionId, ...updatePayload });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    logger.error('Error updating action', error);
    return NextResponse.json({ error: 'Failed to update action' }, { status: 500 });
  }
}
