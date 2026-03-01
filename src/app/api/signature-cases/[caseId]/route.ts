import { NextRequest, NextResponse } from 'next/server';
import { getDoc, getDocs, query, where } from 'firebase/firestore';
import { verifySession, verifyTenantAccess, authErrorResponse, AuthError } from '@/lib/auth/verify-session';
import { collections } from '@/lib/firebase';
import { hydrateSignatureCase } from '@/lib/signature-case-engine';

interface Params { params: Promise<{ caseId: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { caseId } = await params;
    const { user } = await verifySession(request);

    const caseSnap = await getDoc(collections.signatureCase(caseId));
    if (!caseSnap.exists()) return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    const caseData = caseSnap.data();

    await verifyTenantAccess(user, caseData.tenantId);
    const signerQuery = await getDocs(query(collections.signatureCaseSigners(caseId), where('userId', '==', user.uid), where('status', 'in', ['pending', 'ready', 'signed', 'declined', 'expired'])));
    const isCreator = caseData.createdByUserId === user.uid;
    const role = user.tenants?.[caseData.tenantId];
    const isEditor = ['admin', 'chair', 'secretary'].includes(role || '');

    if (!isCreator && !isEditor && signerQuery.empty) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const fullCase = await hydrateSignatureCase(caseId);
    return NextResponse.json({ case: fullCase });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    return NextResponse.json({ error: 'Failed to fetch signature case' }, { status: 500 });
  }
}
