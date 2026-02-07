/**
 * Stripe Billing Portal API
 *
 * Creates a billing portal session for customers to manage their subscription.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createBillingPortalSession, isStripeConfigured } from '@/lib/stripe-service';

export async function POST(request: NextRequest) {
  try {
    // Check if Stripe is configured
    if (!isStripeConfigured()) {
      return NextResponse.json(
        {
          error: 'Payment system not configured',
          message: 'Stripe is not set up. Please contact support.',
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { customerId, returnUrl } = body as {
      customerId: string;
      returnUrl: string;
    };

    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const finalReturnUrl = returnUrl || `${baseUrl}/dashboard`;

    const session = await createBillingPortalSession(customerId, finalReturnUrl);

    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    console.error('Billing portal error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create billing portal session',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
