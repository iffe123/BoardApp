import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/webhooks/visma - Handle Visma eEkonomi webhooks
 *
 * Receives webhook notifications from Visma when financial data changes
 * and triggers appropriate sync actions.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventType, companyId, resourceType, resourceId } = body;

    if (!eventType) {
      return NextResponse.json({ error: 'Missing eventType' }, { status: 400 });
    }

    console.log(`[Visma Webhook] Event: ${eventType}, Company: ${companyId}, Resource: ${resourceType}/${resourceId}`);

    // Handle different event types
    switch (eventType) {
      case 'voucher.created':
      case 'voucher.updated':
      case 'invoice.created':
      case 'invoice.paid': {
        if (companyId) {
          console.log(`[Visma Webhook] Financial data changed for company ${companyId}`);
        }
        break;
      }

      case 'fiscalyear.closed': {
        console.log(`[Visma Webhook] Fiscal year closed for company ${companyId}`);
        break;
      }

      default:
        console.log(`[Visma Webhook] Unhandled event: ${eventType}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Visma webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
