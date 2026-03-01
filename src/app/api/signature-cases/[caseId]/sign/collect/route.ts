import { NextRequest, NextResponse } from 'next/server';
import { getDoc, getDocs, updateDoc } from 'firebase/firestore';
import { collections, Timestamp } from '@/lib/firebase';
import { verifySession, verifyTenantAccess, authErrorResponse, AuthError } from '@/lib/auth/verify-session';
import { allSignersSigned, appendSignatureEvent, hydrateSignatureCase, moveSequentialSigner, setInboxStatus, userSignerForCase } from '@/lib/signature-case-engine';

interface Params { params: Promise<{ caseId: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { user } = await verifySession(request);
    const { caseId } = await params;
    const { tenantId, orderRef } = await request.json();
    await verifyTenantAccess(user, tenantId);

    const signerDoc = await userSignerForCase(caseId, user.uid);
    if (!signerDoc) return NextResponse.json({ error: 'Signer not found' }, { status: 404 });
    if (signerDoc.data().signatureArtifact?.providerRef !== orderRef) {
      return NextResponse.json({ error: 'Invalid orderRef' }, { status: 403 });
    }

    // Mock collect behavior: immediate completion
    await updateDoc(signerDoc.ref, { status: 'signed', signedAt: Timestamp.now() });
    await appendSignatureEvent(caseId, { tenantId, type: 'sign_success', actorUserId: user.uid, payload: { signerId: signerDoc.id, orderRef } });
    await setInboxStatus(user.uid, caseId, tenantId, 'completed');

    const caseSnap = await getDoc(collections.signatureCase(caseId));
    if (!caseSnap.exists()) return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    const caseData = caseSnap.data();

    if (caseData.signingOrder === 'sequential') {
      await moveSequentialSigner(caseId, tenantId, user.uid);
    }

    if (await allSignersSigned(caseId)) {
      await updateDoc(collections.signatureCase(caseId), { status: 'completed', completedAt: Timestamp.now() });
      await appendSignatureEvent(caseId, { tenantId, type: 'case_completed', actorUserId: user.uid });
      const signers = await getDocs(collections.signatureCaseSigners(caseId));
      await Promise.all(signers.docs.map((s) => setInboxStatus(s.data().userId, caseId, tenantId, 'completed')));
    }

    return NextResponse.json({ case: await hydrateSignatureCase(caseId) });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    return NextResponse.json({ error: 'Failed to collect signature' }, { status: 500 });
  }
}
