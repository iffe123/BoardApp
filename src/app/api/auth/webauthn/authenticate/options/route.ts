import { NextRequest, NextResponse } from 'next/server';
import { Timestamp, collections } from '@/lib/firebase';
import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { verifySession, authErrorResponse, AuthError, verifyTenantAccess } from '@/lib/auth/verify-session';
import { challengeExpiresAt, createChallenge, getTenantSecurityPolicy, shouldRequireStepUp } from '@/lib/webauthn';

export async function POST(request: NextRequest) {
  try {
    const { user } = await verifySession(request);
    const { tenantId } = await request.json();
    if (!tenantId) return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });

    await verifyTenantAccess(user, tenantId);
    const policy = await getTenantSecurityPolicy(tenantId);
    const role = user.tenants?.[tenantId];
    const required = shouldRequireStepUp(policy, role);

    if (!required) {
      return NextResponse.json({ bypass: true });
    }

    const credentialSnapshot = await getDocs(collection(collections.user(user.uid), 'webauthnCredentials'));
    const allowCredentials = credentialSnapshot.docs.map((d) => ({ id: d.id, type: 'public-key' }));

    const challenge = createChallenge();
    const challengeId = uuidv4();
    await setDoc(doc(collections.user(user.uid), 'webauthnChallenges', challengeId), {
      userId: user.uid,
      tenantId,
      purpose: 'authentication',
      challenge,
      expiresAt: challengeExpiresAt(),
      createdAt: Timestamp.now(),
    });

    return NextResponse.json({
      options: {
        challenge,
        timeout: 60000,
        userVerification: 'preferred',
        allowCredentials,
      },
      noCredentials: allowCredentials.length === 0,
    });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    return NextResponse.json({ error: 'Failed to create auth options' }, { status: 500 });
  }
}
