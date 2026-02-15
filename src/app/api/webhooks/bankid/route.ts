import { NextRequest, NextResponse } from 'next/server';
import { createAuditLog } from '@/lib/audit-service';

/**
 * POST /api/webhooks/bankid - Handle BankID signing callbacks
 *
 * Some BankID integration partners send webhook callbacks when
 * a signature is completed, rather than requiring polling.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderRef, status, completionData, reference } = body;

    if (!orderRef || !status) {
      return NextResponse.json(
        { error: 'Missing orderRef or status' },
        { status: 400 }
      );
    }

    console.log(`[BankID Webhook] Order: ${orderRef}, Status: ${status}`);

    // Parse the reference to extract tenant/document/signer info
    let tenantId = 'unknown';
    let documentId = 'unknown';
    let signerId = 'unknown';

    if (reference) {
      const parts = reference.split(':');
      if (parts.length >= 3) {
        tenantId = parts[0]!;
        documentId = parts[1]!;
        signerId = parts[2]!;
      }
    }

    switch (status) {
      case 'complete': {
        // Signature completed successfully
        await createAuditLog({
          tenantId,
          action: 'document.signed',
          resourceType: 'document',
          resourceId: documentId,
          actorId: signerId,
          actorName: completionData?.user?.name || 'Unknown',
          metadata: {
            orderRef,
            signatureMethod: 'bankid',
            completedAt: completionData?.timestamp,
          },
        });
        break;
      }

      case 'failed':
      case 'expired': {
        await createAuditLog({
          tenantId,
          action: 'document.signature_failed',
          resourceType: 'document',
          resourceId: documentId,
          actorId: signerId,
          actorName: 'Unknown',
          metadata: {
            orderRef,
            status,
            reason: body.hintCode || 'Unknown',
          },
        });
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('BankID webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
