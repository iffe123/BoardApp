/**
 * Stripe Checkout Session API
 *
 * Creates a checkout session for subscription purchases.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession, PRICE_PLANS, isStripeConfigured } from '@/lib/stripe-service';
import type { SubscriptionTier } from '@/types/schema';

export async function POST(request: NextRequest) {
  try {
    // Check if Stripe is configured
    if (!isStripeConfigured()) {
      return NextResponse.json(
        {
          error: 'Payment system not configured',
          message: 'Stripe is not set up. Please contact support.',
          setupRequired: true,
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const {
      tenantId,
      tier,
      billingPeriod = 'annual',
      email,
      customerId,
    } = body as {
      tenantId: string;
      tier: SubscriptionTier;
      billingPeriod?: 'monthly' | 'annual';
      email?: string;
      customerId?: string;
    };

    // Validate required fields
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    if (!tier || !PRICE_PLANS[tier]) {
      return NextResponse.json(
        { error: 'Invalid subscription tier' },
        { status: 400 }
      );
    }

    // Get the price ID for the selected plan
    const plan = PRICE_PLANS[tier];
    const priceId = billingPeriod === 'monthly'
      ? plan.stripePriceIdMonthly
      : plan.stripePriceIdAnnual;

    if (!priceId) {
      return NextResponse.json(
        {
          error: 'Price not configured',
          message: `The ${tier} plan is not yet available for purchase. Please contact sales.`,
        },
        { status: 400 }
      );
    }

    // Construct URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const successUrl = `${baseUrl}/dashboard/${tenantId}/settings?session_id={CHECKOUT_SESSION_ID}&success=true`;
    const cancelUrl = `${baseUrl}/pricing?cancelled=true`;

    // Create checkout session
    const session = await createCheckoutSession({
      tenantId,
      customerId,
      email,
      priceId,
      successUrl,
      cancelUrl,
      trialDays: tier === 'starter' ? 14 : 0, // 14-day trial for starter plan
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Checkout session error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create checkout session',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
