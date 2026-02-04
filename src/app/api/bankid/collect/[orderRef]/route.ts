import { NextRequest, NextResponse } from 'next/server';
import { collections, Timestamp } from '@/lib/firebase';
import { getDocs, query, where, updateDoc } from 'firebase/firestore';
import { createAuditLog } from '@/lib/audit-service';

// BankID Configuration
const BANKID_API_URL = process.env.BANKID_API_URL || 'https://appapi2.test.bankid.com/rp/v6.0';
const USE_MOCK = process.env.BANKID_USE_MOCK === 'true' || !process.env.BANKID_PFX_PATH;

interface BankIDCollectResponse {
  orderRef: string;
  status: 'pending' | 'complete' | 'failed';
  hintCode?: string;
  completionData?: {
    user: {
      personalNumber: string;
      name: string;
      givenName: string;
      surname: string;
    };
    device: {
      ipAddress: string;
    };
    cert: {
      notBefore: string;
      notAfter: string;
    };
    signature: string;
    ocspResponse: string;
  };
}

// Mock implementation for development
async function mockBankIDCollect(
  orderRef: string
): Promise<BankIDCollectResponse> {
  // Simulate completion after a few calls
  // In real implementation, this would check actual BankID status

  // For mock, we'll auto-complete after checking
  return {
    orderRef,
    status: 'complete',
    completionData: {
      user: {
        personalNumber: '199001011234',
        name: 'Test Testsson',
        givenName: 'Test',
        surname: 'Testsson',
      },
      device: {
        ipAddress: '127.0.0.1',
      },
      cert: {
        notBefore: new Date().toISOString(),
        notAfter: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      },
      signature: Buffer.from('mock-signature-data').toString('base64'),
      ocspResponse: Buffer.from('mock-ocsp-response').toString('base64'),
    },
  };
}

// Real BankID implementation
async function realBankIDCollect(orderRef: string): Promise<BankIDCollectResponse> {
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

  const response = await fetch(`${BANKID_API_URL}/collect`, {
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
    throw new Error(error.errorCode || 'BankID collect request failed');
  }

  return response.json();
}

interface Params {
  params: Promise<{ orderRef: string }>;
}

// GET /api/bankid/collect/[orderRef] - Check signature status
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { orderRef } = await params;
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

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

    // If already complete or failed, return cached status
    if (signatureData.status === 'complete' || signatureData.status === 'failed') {
      return NextResponse.json({
        status: signatureData.status,
        completionData: signatureData.completionData,
        signedAt: signatureData.signedAt,
        errorCode: signatureData.errorCode,
      });
    }

    // Poll BankID for status
    let collectResult: BankIDCollectResponse;

    if (signatureData.isMock || USE_MOCK) {
      collectResult = await mockBankIDCollect(orderRef);
    } else {
      collectResult = await realBankIDCollect(orderRef);
    }

    // Update signature record based on status
    if (collectResult.status === 'complete') {
      await updateDoc(signatureDoc.ref, {
        status: 'complete',
        completionData: collectResult.completionData,
        signedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        signerName: collectResult.completionData?.user.name,
        signerPersonalNumber: collectResult.completionData?.user.personalNumber,
        certificate: {
          notBefore: collectResult.completionData?.cert.notBefore,
          notAfter: collectResult.completionData?.cert.notAfter,
        },
        signature: collectResult.completionData?.signature,
        ocspResponse: collectResult.completionData?.ocspResponse,
      });

      // Create audit log
      await createAuditLog({
        tenantId,
        action: 'signature.completed',
        resourceType: 'document',
        resourceId: signatureData.documentId,
        actorId: signatureData.userId,
        actorName: collectResult.completionData?.user.name || 'Unknown',
        metadata: {
          signatureId: signatureDoc.id,
          orderRef,
          signerName: collectResult.completionData?.user.name,
        },
      });
    } else if (collectResult.status === 'failed') {
      await updateDoc(signatureDoc.ref, {
        status: 'failed',
        errorCode: collectResult.hintCode,
        updatedAt: Timestamp.now(),
      });

      // Create audit log
      await createAuditLog({
        tenantId,
        action: 'signature.failed',
        resourceType: 'document',
        resourceId: signatureData.documentId,
        actorId: signatureData.userId,
        actorName: signatureData.userName || 'Unknown',
        metadata: {
          signatureId: signatureDoc.id,
          orderRef,
          errorCode: collectResult.hintCode,
        },
      });
    }

    return NextResponse.json({
      status: collectResult.status,
      hintCode: collectResult.hintCode,
      completionData: collectResult.status === 'complete' ? collectResult.completionData : undefined,
    });
  } catch (error) {
    console.error('BankID collect error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check signature status' },
      { status: 500 }
    );
  }
}
