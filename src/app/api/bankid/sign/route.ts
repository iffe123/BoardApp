import { NextRequest, NextResponse } from 'next/server';
import { collections, Timestamp } from '@/lib/firebase';
import { addDoc, updateDoc, getDoc } from 'firebase/firestore';
import { createAuditLog } from '@/lib/audit-service';
import crypto from 'crypto';

// BankID Configuration
const BANKID_API_URL = process.env.BANKID_API_URL || 'https://appapi2.test.bankid.com/rp/v6.0';
const USE_MOCK = process.env.BANKID_USE_MOCK === 'true' || !process.env.BANKID_PFX_PATH;

// Mock BankID implementation for development
async function mockBankIDSign(
  personalNumber: string,
  userVisibleData: string
): Promise<{ orderRef: string; autoStartToken: string }> {
  // Generate mock order reference and auto-start token
  const orderRef = `mock-${crypto.randomUUID()}`;
  const autoStartToken = crypto.randomUUID();

  return {
    orderRef,
    autoStartToken,
  };
}

// Real BankID implementation
async function realBankIDSign(
  personalNumber: string,
  userVisibleData: string,
  endUserIp: string
): Promise<{ orderRef: string; autoStartToken: string }> {
  // Load certificate
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

  // Prepare request body
  const body = JSON.stringify({
    personalNumber,
    endUserIp,
    userVisibleData: Buffer.from(userVisibleData).toString('base64'),
    requirement: {
      allowFingerprint: true,
    },
  });

  // Make request to BankID
  const response = await fetch(`${BANKID_API_URL}/sign`, {
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
    throw new Error(error.errorCode || 'BankID sign request failed');
  }

  return response.json();
}

// POST /api/bankid/sign - Initiate signing
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tenantId,
      userId,
      userName,
      documentId,
      documentType, // 'minutes' | 'document' | 'decision'
      personalNumber,
      userVisibleData,
    } = body;

    if (!tenantId || !userId || !documentId || !userVisibleData) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get client IP for BankID
    const forwarded = request.headers.get('x-forwarded-for');
    const endUserIp = forwarded?.split(',')[0] || '127.0.0.1';

    let signResult;

    if (USE_MOCK) {
      signResult = await mockBankIDSign(personalNumber, userVisibleData);
    } else {
      signResult = await realBankIDSign(personalNumber, userVisibleData, endUserIp);
    }

    // Store pending signature in Firestore
    const signatureRecord = {
      tenantId,
      userId,
      userName,
      documentId,
      documentType,
      orderRef: signResult.orderRef,
      autoStartToken: signResult.autoStartToken,
      status: 'pending' as const,
      personalNumber: personalNumber || null,
      userVisibleData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      isMock: USE_MOCK,
    };

    const signatureRef = await addDoc(collections.signatures(tenantId), signatureRecord);

    // Create audit log
    await createAuditLog({
      tenantId,
      action: 'signature.initiated',
      resourceType: 'document',
      resourceId: documentId,
      actorId: userId,
      actorName: userName || 'Unknown',
      metadata: {
        signatureId: signatureRef.id,
        orderRef: signResult.orderRef,
        documentType,
        isMock: USE_MOCK,
      },
    });

    return NextResponse.json({
      success: true,
      signatureId: signatureRef.id,
      orderRef: signResult.orderRef,
      autoStartToken: signResult.autoStartToken,
      // Generate QR code start URL for BankID app
      qrStartUrl: USE_MOCK ? null : `bankid:///?autostarttoken=${signResult.autoStartToken}&redirect=null`,
    });
  } catch (error) {
    console.error('BankID sign error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initiate signing' },
      { status: 500 }
    );
  }
}
