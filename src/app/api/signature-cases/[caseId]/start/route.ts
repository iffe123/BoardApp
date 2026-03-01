import { NextRequest, NextResponse } from 'next/server';
import { getDoc, getDocs, orderBy, query, runTransaction } from 'firebase/firestore';
import { collections, db, Timestamp } from '@/lib/firebase';
import { verifySession, verifyTenantRole, authErrorResponse, AuthError } from '@/lib/auth/verify-session';
import { appendSignatureEvent, hydrateSignatureCase, notifySigner, setInboxStatus } from '@/lib/signature-case-engine';

interface Params { params: Promise<{ caseId: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { user } = await verifySession(request);
    const { caseId } = await params;
    const caseSnap = await getDoc(collections.signatureCase(caseId));
    if (!caseSnap.exists()) return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    const caseData = caseSnap.data();

    await verifyTenantRole(user, caseData.tenantId, ['admin', 'chair', 'secretary']);

    await runTransaction(db, async (tx) => {
      const liveCase = await tx.get(collections.signatureCase(caseId));
      if (!liveCase.exists() || liveCase.data().status !== 'draft') throw new Error('Only draft cases can be started');

      const signersSnap = await tx.get(query(collections.signatureCaseSigners(caseId), orderBy('orderIndex', 'asc')));
      if (signersSnap.empty) throw new Error('Case must contain at least one signer');

      tx.update(collections.signatureCase(caseId), { status: 'in_progress', startedAt: Timestamp.now() });
      signersSnap.docs.forEach((signerDoc, index) => {
        const nextStatus = caseData.signingOrder === 'parallel' || index === 0 ? 'ready' : 'pending';
        tx.update(signerDoc.ref, { status: nextStatus });
      });
    });

    await appendSignatureEvent(caseId, { tenantId: caseData.tenantId, type: 'case_started', actorUserId: user.uid });
    const signersSnap = await getDocs(query(collections.signatureCaseSigners(caseId), orderBy('orderIndex', 'asc')));
    for (const signerDoc of signersSnap.docs) {
      if (signerDoc.data().status !== 'ready') {
        await setInboxStatus(signerDoc.data().userId, caseId, caseData.tenantId, 'waiting');
        continue;
      }
      await appendSignatureEvent(caseId, { tenantId: caseData.tenantId, type: 'signer_ready', actorUserId: user.uid, payload: { userId: signerDoc.data().userId } });
      await notifySigner({
        tenantId: caseData.tenantId,
        caseId,
        signerUserId: signerDoc.data().userId,
        signerEmail: signerDoc.data().email,
        signerName: signerDoc.data().name,
        caseTitle: caseData.title,
      });
      await appendSignatureEvent(caseId, { tenantId: caseData.tenantId, type: 'signer_notified', actorUserId: user.uid, payload: { userId: signerDoc.data().userId } });
      await setInboxStatus(signerDoc.data().userId, caseId, caseData.tenantId, 'action_required');
    }

    return NextResponse.json({ case: await hydrateSignatureCase(caseId) });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to start case' }, { status: 500 });
  }
}
