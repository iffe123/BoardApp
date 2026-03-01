import { NextRequest, NextResponse } from 'next/server';
import { getDoc, updateDoc } from 'firebase/firestore';
import { collections, Timestamp } from '@/lib/firebase';
import { verifySession, verifyTenantAccess, authErrorResponse, AuthError } from '@/lib/auth/verify-session';
import { appendSignatureEvent, notifyCaseCreatorDeclined, setInboxStatus, userSignerForCase } from '@/lib/signature-case-engine';

interface Params { params: Promise<{ caseId: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { user } = await verifySession(request);
    const { caseId } = await params;
    const { tenantId, reason } = await request.json();
    await verifyTenantAccess(user, tenantId);

    const signerDoc = await userSignerForCase(caseId, user.uid);
    if (!signerDoc) return NextResponse.json({ error: 'Signer not found' }, { status: 404 });
    if (signerDoc.data().status !== 'ready') return NextResponse.json({ error: 'Only ready signer can decline' }, { status: 403 });

    await updateDoc(signerDoc.ref, { status: 'declined', declinedAt: Timestamp.now() });
    await updateDoc(collections.signatureCase(caseId), { status: 'canceled' });
    await appendSignatureEvent(caseId, { tenantId, type: 'sign_declined', actorUserId: user.uid, payload: { reason: reason || null } });
    await appendSignatureEvent(caseId, { tenantId, type: 'case_canceled', actorUserId: user.uid, payload: { reason: 'declined' } });

    const caseSnap = await getDoc(collections.signatureCase(caseId));
    if (caseSnap.exists()) {
      await notifyCaseCreatorDeclined({
        caseId,
        tenantId,
        creatorUserId: caseSnap.data().createdByUserId,
        title: caseSnap.data().title,
        declinedSignerName: signerDoc.data().name,
      });
    }

    await setInboxStatus(user.uid, caseId, tenantId, 'completed');
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    return NextResponse.json({ error: 'Failed to decline signature' }, { status: 500 });
  }
}
