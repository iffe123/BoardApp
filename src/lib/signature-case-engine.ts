import { collections, Timestamp, db } from '@/lib/firebase';
import { addDoc, getDoc, getDocs, query, runTransaction, updateDoc, where, orderBy, limit, setDoc } from 'firebase/firestore';
import { createNotification } from '@/lib/notification-service';
import { sendEmail } from '@/lib/email-service';

export type SignatureCaseStatus = 'draft' | 'in_progress' | 'completed' | 'expired' | 'canceled';
export type SignerStatus = 'pending' | 'ready' | 'signed' | 'declined' | 'expired';
export type SigningOrder = 'parallel' | 'sequential';

export const REMINDER_MIN_INTERVAL_MS = 6 * 60 * 60 * 1000;

export async function appendSignatureEvent(caseId: string, input: { tenantId: string; type: string; actorUserId?: string; payload?: Record<string, unknown> }) {
  await addDoc(collections.signatureCaseEvents(caseId), {
    tenantId: input.tenantId,
    type: input.type,
    actorUserId: input.actorUserId || null,
    payload: input.payload || null,
    createdAt: Timestamp.now(),
  });
}

export async function notifySigner(params: { tenantId: string; caseId: string; signerUserId: string; signerEmail: string; signerName: string; caseTitle: string }) {
  const resourceUrl = `/dashboard/${params.tenantId}/signature-cases/${params.caseId}`;
  await createNotification({
    userId: params.signerUserId,
    tenantId: params.tenantId,
    type: 'signature_required',
    title: 'Signature required',
    body: `Please sign: ${params.caseTitle}`,
    resourceType: 'signature_case',
    resourceId: params.caseId,
    resourceUrl,
    deliveredVia: ['in_app', 'email'],
  });

  await sendEmail({
    to: { email: params.signerEmail, name: params.signerName },
    subject: `Signature required: ${params.caseTitle}`,
    html: `<p>Hello ${params.signerName || ''},</p><p>You have a signature request: <strong>${params.caseTitle}</strong>.</p><p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${resourceUrl}">Open signature case</a></p>`,
    text: `You have a signature request: ${params.caseTitle}. Open: ${(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')}${resourceUrl}`,
  });
}

export async function hydrateSignatureCase(caseId: string) {
  const caseSnap = await getDoc(collections.signatureCase(caseId));
  if (!caseSnap.exists()) return null;

  const [signersSnap, eventsSnap] = await Promise.all([
    getDocs(query(collections.signatureCaseSigners(caseId), orderBy('orderIndex', 'asc'))),
    getDocs(query(collections.signatureCaseEvents(caseId), orderBy('createdAt', 'desc'), limit(50))),
  ]);

  return {
    id: caseSnap.id,
    ...caseSnap.data(),
    signers: signersSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    events: eventsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
  };
}

export async function setInboxStatus(userId: string, caseId: string, tenantId: string, status: 'action_required' | 'waiting' | 'completed') {
  await setDoc(collections.signatureInboxItem(userId, caseId), {
    tenantId,
    caseId,
    status,
    updatedAt: Timestamp.now(),
    createdAt: Timestamp.now(),
  }, { merge: true });
}

export async function expireCaseIfNeeded(caseId: string) {
  await runTransaction(db, async (tx) => {
    const caseRef = collections.signatureCase(caseId);
    const caseSnap = await tx.get(caseRef);
    if (!caseSnap.exists()) return;
    const caseData = caseSnap.data();
    if (caseData.status !== 'in_progress' || !caseData.expiresAt) return;
    const expiresAtMs = caseData.expiresAt.toMillis ? caseData.expiresAt.toMillis() : new Date(caseData.expiresAt).getTime();
    if (Date.now() <= expiresAtMs) return;

    tx.update(caseRef, { status: 'expired' });
    const signersSnap = await tx.get(collections.signatureCaseSigners(caseId));
    signersSnap.docs.forEach((s) => {
      if (s.data().status === 'ready' || s.data().status === 'pending') {
        tx.update(s.ref, { status: 'expired' });
      }
    });
  });
}

export async function moveSequentialSigner(caseId: string, tenantId: string, actorUserId?: string) {
  const signersSnap = await getDocs(query(collections.signatureCaseSigners(caseId), orderBy('orderIndex', 'asc')));
  const next = signersSnap.docs.find((docSnap) => docSnap.data().status === 'pending');
  if (!next) return null;

  await updateDoc(next.ref, {
    status: 'ready',
  });
  await appendSignatureEvent(caseId, { tenantId, actorUserId, type: 'signer_ready', payload: { signerId: next.id, userId: next.data().userId } });
  await notifySigner({
    tenantId,
    caseId,
    signerUserId: next.data().userId,
    signerEmail: next.data().email,
    signerName: next.data().name,
    caseTitle: (await getDoc(collections.signatureCase(caseId))).data()?.title || 'Signature case',
  });
  await appendSignatureEvent(caseId, { tenantId, actorUserId, type: 'signer_notified', payload: { signerId: next.id, userId: next.data().userId } });
  await setInboxStatus(next.data().userId, caseId, tenantId, 'action_required');
  return next.id;
}

export async function allSignersSigned(caseId: string) {
  const signersSnap = await getDocs(collections.signatureCaseSigners(caseId));
  return signersSnap.docs.every((docSnap) => docSnap.data().status === 'signed');
}

export async function userSignerForCase(caseId: string, userId: string) {
  const snapshot = await getDocs(query(collections.signatureCaseSigners(caseId), where('userId', '==', userId), limit(1)));
  if (snapshot.empty) return null;
  return snapshot.docs[0]!;
}

export async function notifyCaseCreatorDeclined(params: { caseId: string; tenantId: string; creatorUserId: string; title: string; declinedSignerName: string }) {
  await createNotification({
    userId: params.creatorUserId,
    tenantId: params.tenantId,
    type: 'signature_required',
    title: 'Signature case declined',
    body: `${params.declinedSignerName} declined signature request for ${params.title}`,
    resourceType: 'signature_case',
    resourceId: params.caseId,
    resourceUrl: `/dashboard/${params.tenantId}/signature-cases/${params.caseId}`,
    deliveredVia: ['in_app'],
  });
}
