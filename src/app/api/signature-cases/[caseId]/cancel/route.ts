import { NextRequest, NextResponse } from 'next/server';
import { getDoc, updateDoc } from 'firebase/firestore';
import { collections } from '@/lib/firebase';
import { verifySession, verifyTenantRole, authErrorResponse, AuthError } from '@/lib/auth/verify-session';
import { appendSignatureEvent } from '@/lib/signature-case-engine';

interface Params { params: Promise<{ caseId: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { user } = await verifySession(request);
    const { caseId } = await params;
    const caseSnap = await getDoc(collections.signatureCase(caseId));
    if (!caseSnap.exists()) return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    const caseData = caseSnap.data();
    await verifyTenantRole(user, caseData.tenantId, ['admin', 'chair', 'secretary']);
    await updateDoc(collections.signatureCase(caseId), { status: 'canceled' });
    await appendSignatureEvent(caseId, { tenantId: caseData.tenantId, type: 'case_canceled', actorUserId: user.uid });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    return NextResponse.json({ error: 'Failed to cancel case' }, { status: 500 });
  }
}
