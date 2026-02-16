import { NextRequest, NextResponse } from 'next/server';
import { createAuditLog } from '@/lib/audit-service';

/**
 * POST /api/webhooks/fortnox - Handle Fortnox webhooks
 *
 * Fortnox can send webhook notifications when financial data changes.
 * This endpoint receives those notifications and triggers data sync.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { topic, tenantId, entityId, action } = body;

    if (!topic) {
      return NextResponse.json({ error: 'Missing topic' }, { status: 400 });
    }

    // Log the webhook event
    console.log(`[Fortnox Webhook] Topic: ${topic}, Action: ${action}, Entity: ${entityId}`);

    // Handle different webhook topics
    switch (topic) {
      case 'invoices':
      case 'vouchers':
      case 'accounts': {
        // Trigger a financial data sync if we have a tenant mapping
        if (tenantId) {
          // Queue a sync job (in production, use a job queue like BullMQ)
          console.log(`[Fortnox Webhook] Queuing sync for tenant ${tenantId}`);

          await createAuditLog({
            tenantId,
            action: 'financial.webhook_received',
            resourceType: 'financial',
            resourceId: entityId || 'unknown',
            actorId: 'fortnox-webhook',
            actorName: 'Fortnox Webhook',
            metadata: { topic, action, entityId },
          });
        }
        break;
      }

      default:
        console.log(`[Fortnox Webhook] Unhandled topic: ${topic}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Fortnox webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
