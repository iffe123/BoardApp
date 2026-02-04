import { NextRequest, NextResponse } from 'next/server';
import { collections, Timestamp } from '@/lib/firebase';
import { getDocs, query, where, updateDoc } from 'firebase/firestore';
import { createAuditLog } from '@/lib/audit-service';

// BankID Configuration
const BANKID_API_URL = process.env.BANKID_API_URL || 'https://appapi2.test.bankid.com/rp/v6.0';
const USE_MOCK = process.env.BANKID_USE_MOCK === 'true' || !process.env.BANKID_PFX_PATH;

// Real BankID cancel implementation
async function realBankIDCancel(orderRef: string): Promise<void> {
  const fs = await import('fs');
  const https = await import('https');

  const pfxPath = process.env.BANKID_PFX_PATH!;
  const pfxPassphrase = process.env.BANKID_PFX_PASSPHRASE!;
  const caPath = process.env.BANKID_CA_PATH;

  const pfx = fs.readFileSync(pfxPath);
  const ca = caPath ? fs.readFileSync(caPath) : undefined;

  const agent = new https.Agent({
    pfx,
    passphrase: pfxPassphrase,
    ca,
    rejectUnauthorized: true,
  });

  const body = JSON.stringify({ orderRef });

  const response = await fetch(`${BANKID_API_URL}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body,
    // @ts-ignore - agent for https
    agent,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.errorCode || 'BankID cancel request failed');
  }
}

// POST /api/bankid/cancel - Cancel a pending signature
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, orderRef, userId, userName } = body;

    if (!tenantId || !orderRef) {
      return NextResponse.json(
        { error: 'Missing tenantId or orderRef' },
        { status: 400 }
      );
    }

    // Find the signature record
    const signaturesQuery = query(
      collections.signatures(tenantId),
      where('orderRef', '==', orderRef)
    );
    const snapshot = await getDocs(signaturesQuery);

    if (snapshot.empty) {
      return NextResponse.json(
        { error: 'Signature not found' },
        { status: 404 }
      );
    }

    const signatureDoc = snapshot.docs[0];
    const signatureData = signatureDoc.data();

    // Only cancel if pending
    if (signatureData.status !== 'pending') {
      return NextResponse.json(
        { error: 'Signature is not pending' },
        { status: 400 }
      );
    }

    // Cancel with BankID (only if real)
    if (!signatureData.isMock && !USE_MOCK) {
      await realBankIDCancel(orderRef);
    }

    // Update signature record
    await updateDoc(signatureDoc.ref, {
      status: 'cancelled',
      updatedAt: Timestamp.now(),
      cancelledAt: Timestamp.now(),
      cancelledBy: userId,
    });

    // Create audit log
    await createAuditLog({
      tenantId,
      action: 'signature.cancelled',
      resourceType: 'document',
      resourceId: signatureData.documentId,
      actorId: userId || 'unknown',
      actorName: userName || 'Unknown',
      metadata: {
        signatureId: signatureDoc.id,
        orderRef,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Signature cancelled',
    });
  } catch (error) {
    console.error('BankID cancel error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel signature' },
      { status: 500 }
    );
  }
}
