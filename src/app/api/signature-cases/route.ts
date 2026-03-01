import { NextRequest, NextResponse } from 'next/server';
import { addDoc, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { collections, Timestamp, db } from '@/lib/firebase';
import { verifySession, verifyTenantAccess, authErrorResponse, verifyTenantRole, AuthError } from '@/lib/auth/verify-session';
import { appendSignatureEvent } from '@/lib/signature-case-engine';

export async function POST(request: NextRequest) {
  try {
    const { user } = await verifySession(request);
    const body = await request.json();
    const { tenantId, title, description, targetType, targetId, targetVersionId, signingOrder, expiresAt, signers } = body;

    if (!tenantId || !title || !targetType || !targetId || !signingOrder || !Array.isArray(signers) || signers.length < 1) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await verifyTenantAccess(user, tenantId);
    await verifyTenantRole(user, tenantId, ['admin', 'chair', 'secretary']);

    const caseRef = await addDoc(collections.signatureCases(), {
      tenantId,
      boardroomId: body.boardroomId || null,
      createdByUserId: user.uid,
      createdAt: Timestamp.now(),
      title,
      description: description || null,
      targetType,
      targetId,
      targetVersionId: targetVersionId || null,
      signingOrder,
      status: 'draft',
      expiresAt: expiresAt ? Timestamp.fromDate(new Date(expiresAt)) : null,
      startedAt: null,
      completedAt: null,
      lastReminderAt: null,
    });

    const batch = writeBatch(db);
    signers.forEach((signer: { userId: string; name: string; email: string }, index: number) => {
      const signerRef = collections.signatureCaseSigner(caseRef.id, signer.userId);
      batch.set(signerRef, {
        userId: signer.userId,
        name: signer.name,
        email: signer.email,
        orderIndex: index,
        status: 'pending',
        method: 'bankid',
      });
    });
    await batch.commit();

    await appendSignatureEvent(caseRef.id, { tenantId, type: 'case_created', actorUserId: user.uid, payload: { targetType, targetId, signingOrder } });
    for (const signer of signers) {
      await appendSignatureEvent(caseRef.id, { tenantId, type: 'signer_added', actorUserId: user.uid, payload: { userId: signer.userId, email: signer.email } });
    }

    return NextResponse.json({ caseId: caseRef.id }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    return NextResponse.json({ error: 'Failed to create signature case' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { user } = await verifySession(request);
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }
    await verifyTenantAccess(user, tenantId);

    const signerMatches = await getDocs(query(collections.signatureCases(), where('tenantId', '==', tenantId), where('status', '==', 'in_progress')));
    return NextResponse.json({ cases: signerMatches.docs.map((d) => ({ id: d.id, ...d.data() })) });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    return NextResponse.json({ error: 'Failed to fetch signature cases' }, { status: 500 });
  }
}
