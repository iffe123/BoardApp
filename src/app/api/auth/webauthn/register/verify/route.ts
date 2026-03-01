import { NextRequest, NextResponse } from 'next/server';
import { Timestamp, collections } from '@/lib/firebase';
import { collection, doc, getDocs, limit, orderBy, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { verifySession, authErrorResponse, AuthError } from '@/lib/auth/verify-session';
import { createAuditLog, getRequestMetadata } from '@/lib/audit-service';
import { getExpectedOrigins, parseClientDataJSON } from '@/lib/webauthn';

export async function POST(request: NextRequest) {
  try {
    const { user } = await verifySession(request);
    const { tenantId, deviceName, credential } = await request.json();
    if (!tenantId || !deviceName || !credential) {
      return NextResponse.json({ error: 'tenantId, deviceName, credential are required' }, { status: 400 });
    }

    const now = Timestamp.now();
    const challengesQuery = query(
      collection(collections.user(user.uid), 'webauthnChallenges'),
      where('purpose', '==', 'registration'),
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
    const expectedChallenge = challengeData.challenge as string;
    if (clientData.challenge !== expectedChallenge) {
      return NextResponse.json({ error: 'Challenge mismatch' }, { status: 400 });
    }

    if (!getExpectedOrigins().includes(clientData.origin)) {
      return NextResponse.json({ error: 'Origin mismatch' }, { status: 400 });
    }

    const credentialId = credential.id as string;
    await setDoc(doc(collections.user(user.uid), 'webauthnCredentials', credentialId), {
      credentialId,
      publicKey: credential.response.publicKey || '',
      counter: 0,
      transports: credential.response.transports || [],
      deviceName,
      createdAt: now,
      lastUsedAt: now,
    });

    await updateDoc(challengeDoc.ref, { usedAt: now });

    const { actorIp, actorUserAgent } = getRequestMetadata(request);
    await createAuditLog({
      tenantId,
      action: 'webauthn_registered',
      resourceType: 'settings',
      resourceId: credentialId,
      actorId: user.uid,
      actorName: user.name || user.email || 'Unknown',
      actorIp,
      actorUserAgent,
      metadata: { deviceName },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    return NextResponse.json({ error: 'Failed to verify registration' }, { status: 500 });
  }
}
