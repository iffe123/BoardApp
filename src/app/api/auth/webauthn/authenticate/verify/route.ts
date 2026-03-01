import { NextRequest, NextResponse } from 'next/server';
import { Timestamp, collections } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, limit, orderBy, query, updateDoc, where } from 'firebase/firestore';
import { verifySession, authErrorResponse, AuthError, verifyTenantAccess } from '@/lib/auth/verify-session';
import { createAuditLog, getRequestMetadata } from '@/lib/audit-service';
import { createSignedSessionToken, getExpectedOrigins, parseClientDataJSON, WEBAUTHN_COOKIE_NAME, getTenantSecurityPolicy } from '@/lib/webauthn';

export async function POST(request: NextRequest) {
  try {
    const { user } = await verifySession(request);
    const { tenantId, credential } = await request.json();
    if (!tenantId || !credential) return NextResponse.json({ error: 'tenantId and credential are required' }, { status: 400 });
    await verifyTenantAccess(user, tenantId);

    const challengesQuery = query(
      collection(collections.user(user.uid), 'webauthnChallenges'),
      where('purpose', '==', 'authentication'),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
    const snapshot = await getDocs(challengesQuery);
    const challengeDoc = snapshot.docs.find((docSnap) => !(docSnap.data() as Record<string, unknown>).usedAt);
    if (!challengeDoc) return NextResponse.json({ error: 'No active challenge' }, { status: 400 });

    const challengeData = challengeDoc.data() as Record<string, unknown>;
    const expiresAt = challengeData.expiresAt as Timestamp;
    if (expiresAt.toMillis() < Date.now()) {
      return NextResponse.json({ error: 'Challenge expired' }, { status: 400 });
    }

    const clientData = parseClientDataJSON(credential.response.clientDataJSON);
    if (clientData.challenge !== challengeData.challenge) return NextResponse.json({ error: 'Challenge mismatch' }, { status: 400 });
    if (!getExpectedOrigins().includes(clientData.origin)) return NextResponse.json({ error: 'Origin mismatch' }, { status: 400 });

    const credRef = doc(collections.user(user.uid), 'webauthnCredentials', credential.id);
    const credDoc = await getDoc(credRef);
    if (!credDoc.exists()) return NextResponse.json({ error: 'Unknown credential' }, { status: 400 });

    const currentCounter = (credDoc.data().counter as number | undefined) || 0;
    await updateDoc(credRef, { counter: currentCounter + 1, lastUsedAt: Timestamp.now() });
    await updateDoc(challengeDoc.ref, { usedAt: Timestamp.now() });

    const policy = await getTenantSecurityPolicy(tenantId);
    const exp = Math.floor(Date.now() / 1000) + policy.sessionTtlHours * 3600;
    const token = createSignedSessionToken({ userId: user.uid, tenantId, exp });

    const response = NextResponse.json({ success: true });
    response.cookies.set(WEBAUTHN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      expires: new Date(exp * 1000),
    });

    const { actorIp, actorUserAgent } = getRequestMetadata(request);
    await createAuditLog({
      tenantId,
      action: 'webauthn_stepup_success',
      resourceType: 'settings',
      resourceId: credential.id,
      actorId: user.uid,
      actorName: user.name || user.email || 'Unknown',
      actorIp,
      actorUserAgent,
    });

    return response;
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    return NextResponse.json({ error: 'Failed to verify authentication' }, { status: 500 });
  }
}
