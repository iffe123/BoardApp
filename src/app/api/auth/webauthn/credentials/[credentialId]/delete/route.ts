import { NextRequest, NextResponse } from 'next/server';
import { collections } from '@/lib/firebase';
import { collection, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { verifySession, authErrorResponse, AuthError } from '@/lib/auth/verify-session';

export async function POST(request: NextRequest, { params }: { params: { credentialId: string } }) {
  try {
    const { user } = await verifySession(request);
    const { credentialId } = params;

    const credsSnapshot = await getDocs(collection(collections.user(user.uid), 'webauthnCredentials'));
    if (credsSnapshot.size <= 1) {
      return NextResponse.json({ error: 'At least one credential is required' }, { status: 400 });
    }

    await deleteDoc(doc(collections.user(user.uid), 'webauthnCredentials', credentialId));
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    return NextResponse.json({ error: 'Failed to delete credential' }, { status: 500 });
  }
}
