import { NextRequest, NextResponse } from 'next/server';
import { getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { collections, Timestamp } from '@/lib/firebase';
import { verifySession, verifyTenantRole, authErrorResponse, AuthError } from '@/lib/auth/verify-session';
import { appendSignatureEvent, notifySigner } from '@/lib/signature-case-engine';

const REMINDER_INTERVAL_MS = 6 * 60 * 60 * 1000;
interface Params { params: Promise<{ caseId: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { user } = await verifySession(request);
    const { caseId } = await params;
    const caseSnap = await getDoc(collections.signatureCase(caseId));
    if (!caseSnap.exists()) return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    const caseData = caseSnap.data();

    await verifyTenantRole(user, caseData.tenantId, ['admin', 'chair', 'secretary']);

    const lastReminderAt = caseData.lastReminderAt?.toMillis?.() || 0;
    if (lastReminderAt && Date.now() - lastReminderAt < REMINDER_INTERVAL_MS) {
      return NextResponse.json({ error: 'Reminder rate limited' }, { status: 429 });
    }

    const readySigners = await getDocs(query(collections.signatureCaseSigners(caseId), where('status', '==', 'ready')));
    for (const signer of readySigners.docs) {
      await notifySigner({
        tenantId: caseData.tenantId,
        caseId,
        signerUserId: signer.data().userId,
        signerEmail: signer.data().email,
        signerName: signer.data().name,
        caseTitle: caseData.title,
      });
      await appendSignatureEvent(caseId, { tenantId: caseData.tenantId, type: 'signer_notified', actorUserId: user.uid, payload: { userId: signer.data().userId, reason: 'reminder' } });
    }

    await updateDoc(collections.signatureCase(caseId), { lastReminderAt: Timestamp.now() });
    await appendSignatureEvent(caseId, { tenantId: caseData.tenantId, type: 'reminder_sent', actorUserId: user.uid, payload: { signerCount: readySigners.size } });

    return NextResponse.json({ success: true, notified: readySigners.size });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    return NextResponse.json({ error: 'Failed to send reminder' }, { status: 500 });
  }
}
