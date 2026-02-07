/**
 * Stripe Webhook Handler
 *
 * Handles subscription lifecycle events from Stripe.
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import {
  constructWebhookEvent,
  mapSubscriptionStatus,
  getTierFromPriceId,
} from '@/lib/stripe-service';
import { collections, Timestamp, db } from '@/lib/firebase';
import { updateDoc } from 'firebase/firestore';

// Disable body parsing for webhooks (we need the raw body)
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = constructWebhookEvent(body, signature);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCanceled(subscription);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle successful checkout completion
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const tenantId = session.metadata?.tenantId;
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  if (!tenantId) {
    console.error('No tenantId in checkout session metadata');
    return;
  }

  if (!db) {
    console.error('Database not initialized');
    return;
  }

  // Update tenant with Stripe customer and subscription IDs
  const tenantRef = collections.tenant(tenantId);
  await updateDoc(tenantRef, {
    'subscription.stripeCustomerId': customerId,
    'subscription.stripeSubscriptionId': subscriptionId,
    updatedAt: Timestamp.now(),
  });

  console.log(`Checkout completed for tenant: ${tenantId}`);
}

/**
 * Handle subscription updates (created, renewed, plan changed)
 */
async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const tenantId = subscription.metadata?.tenantId;

  if (!tenantId) {
    console.error('No tenantId in subscription metadata');
    return;
  }

  if (!db) {
    console.error('Database not initialized');
    return;
  }

  const priceId = subscription.items.data[0]?.price.id;
  const tier = getTierFromPriceId(priceId);
  const status = mapSubscriptionStatus(subscription.status);
  const periodEnd = new Date(subscription.current_period_end * 1000);

  // Update tenant subscription info
  const tenantRef = collections.tenant(tenantId);
  await updateDoc(tenantRef, {
    'subscription.tier': tier,
    'subscription.status': status,
    'subscription.currentPeriodEnd': Timestamp.fromDate(periodEnd),
    'subscription.stripeSubscriptionId': subscription.id,
    updatedAt: Timestamp.now(),
  });

  console.log(`Subscription updated for tenant: ${tenantId}, tier: ${tier}, status: ${status}`);
}

/**
 * Handle subscription cancellation
 */
async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const tenantId = subscription.metadata?.tenantId;

  if (!tenantId) {
    console.error('No tenantId in subscription metadata');
    return;
  }

  if (!db) {
    console.error('Database not initialized');
    return;
  }

  // Downgrade to free tier
  const tenantRef = collections.tenant(tenantId);
  await updateDoc(tenantRef, {
    'subscription.tier': 'free',
    'subscription.status': 'cancelled',
    updatedAt: Timestamp.now(),
  });

  console.log(`Subscription canceled for tenant: ${tenantId}`);
}

/**
 * Handle successful invoice payment
 */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  // Log successful payment
  console.log(`Invoice paid: ${invoice.id} for customer: ${customerId}`);

  // Could trigger email notification here
}

/**
 * Handle failed invoice payment
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const subscriptionId = invoice.subscription as string;

  console.log(`Payment failed for invoice: ${invoice.id}, subscription: ${subscriptionId}`);

  // Could trigger email notification to customer here
  // Could also update tenant status to 'past_due'
}
