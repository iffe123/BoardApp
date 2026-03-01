import { NextRequest, NextResponse } from 'next/server';
import { Timestamp, collections } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { verifySession, authErrorResponse, AuthError } from '@/lib/auth/verify-session';
import { challengeExpiresAt, createChallenge, getRpId } from '@/lib/webauthn';

export async function POST(request: NextRequest) {
  try {
    const { user } = await verifySession(request);
    const { tenantId } = await request.json();
    if (!tenantId) return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });

    const challenge = createChallenge();
    const challengeId = uuidv4();
    await setDoc(doc(collections.user(user.uid), 'webauthnChallenges', challengeId), {
      userId: user.uid,
      tenantId,
      purpose: 'registration',
      challenge,
      expiresAt: challengeExpiresAt(),
      createdAt: Timestamp.now(),
    });

    const options = {
      rp: { name: 'BoardApp', id: getRpId(request.headers.get('origin')) },
      user: {
        id: Buffer.from(user.uid).toString('base64url'),
        name: user.email || user.uid,
        displayName: user.name || user.email || user.uid,
      },
      challenge,
      pubKeyCredParams: [{ alg: -7, type: 'public-key' }, { alg: -257, type: 'public-key' }],
      timeout: 60000,
      attestation: 'none',
      authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
    };

    return NextResponse.json({ options });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    return NextResponse.json({ error: 'Failed to create registration options' }, { status: 500 });
  }
}
