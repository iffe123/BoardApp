import { NextRequest, NextResponse } from 'next/server';
import { getDoc, updateDoc } from 'firebase/firestore';
import { collections, Timestamp } from '@/lib/firebase';
import { verifySession, verifyTenantAccess, authErrorResponse, AuthError } from '@/lib/auth/verify-session';
import { appendSignatureEvent, userSignerForCase } from '@/lib/signature-case-engine';

interface Params { params: Promise<{ caseId: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { user } = await verifySession(request);
    const { caseId } = await params;
    const { tenantId } = await request.json();
    await verifyTenantAccess(user, tenantId);

    const signerDoc = await userSignerForCase(caseId, user.uid);
    if (!signerDoc) return NextResponse.json({ error: 'Signer not found' }, { status: 404 });
    if (signerDoc.data().status !== 'ready') return NextResponse.json({ error: 'Signer is not ready to sign' }, { status: 403 });

    const caseSnap = await getDoc(collections.signatureCase(caseId));
    if (!caseSnap.exists()) return NextResponse.json({ error: 'Case not found' }, { status: 404 });

    const orderRef = `case-${caseId}-${Date.now()}`;
    const autoStartToken = `token-${Date.now()}`;

    await updateDoc(signerDoc.ref, {
      signatureArtifact: {
        provider: 'bankid',
        providerRef: orderRef,
      },
      updatedAt: Timestamp.now(),
    });
    await appendSignatureEvent(caseId, { tenantId, type: 'sign_attempted', actorUserId: user.uid, payload: { orderRef } });

    return NextResponse.json({ orderRef, autoStartToken });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    return NextResponse.json({ error: 'Failed to initialize signing' }, { status: 500 });
  }
}
