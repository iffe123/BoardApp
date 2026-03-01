import { NextRequest, NextResponse } from 'next/server';
import { collections } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { verifySession, authErrorResponse, AuthError } from '@/lib/auth/verify-session';

export async function GET(request: NextRequest) {
  try {
    const { user } = await verifySession(request);
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    if (!tenantId) return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });

    const snapshot = await getDocs(collection(collections.user(user.uid), 'webauthnCredentials'));
    const credentials = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    return NextResponse.json({ credentials });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    return NextResponse.json({ error: 'Failed to get credentials' }, { status: 500 });
  }
}
