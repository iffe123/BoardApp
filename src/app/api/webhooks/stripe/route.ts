import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/webhooks/stripe - Handle Stripe payment webhooks
 *
 * Processes subscription events for billing management.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    // In production, verify the webhook signature using Stripe's library:
    // const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    const event = JSON.parse(body);
    const { type: eventType, data } = event;

    console.log(`[Stripe Webhook] Event: ${eventType}`);

    switch (eventType) {
      case 'customer.subscription.created': {
        const subscription = data.object;
        console.log(`[Stripe] Subscription created: ${subscription.id}`);
        // Update tenant subscription status
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = data.object;
        console.log(`[Stripe] Subscription updated: ${subscription.id}, Status: ${subscription.status}`);
        // Update tenant subscription tier/status
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = data.object;
        console.log(`[Stripe] Subscription cancelled: ${subscription.id}`);
        // Downgrade tenant to free tier
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = data.object;
        console.log(`[Stripe] Payment succeeded: ${invoice.id}`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = data.object;
        console.log(`[Stripe] Payment failed: ${invoice.id}`);
        // Notify tenant admins about failed payment
        break;
      }

      default:
        console.log(`[Stripe] Unhandled event: ${eventType}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
