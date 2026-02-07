/**
 * Stripe Payment Service for GovernanceOS
 *
 * Handles subscription management, payment processing, and billing.
 *
 * SETUP INSTRUCTIONS:
 * 1. Create a Stripe account at https://stripe.com
 * 2. Get your API keys from the Stripe Dashboard
 * 3. Add STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY to .env.local
 * 4. Create products and prices in Stripe Dashboard
 * 5. Set up webhook endpoint for subscription events
 */

import Stripe from 'stripe';
import type { SubscriptionTier } from '@/types/schema';

// Initialize Stripe with secret key (server-side only)
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

let stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripe) {
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured. Please add it to your .env.local file.');
    }
    stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-12-18.acacia',
      typescript: true,
    });
  }
  return stripe;
}

// ============================================================================
// PRICING CONFIGURATION
// ============================================================================

export interface PricePlan {
  tier: SubscriptionTier;
  name: string;
  description: string;
  priceMonthly: number; // in SEK
  priceAnnual: number; // in SEK
  stripePriceIdMonthly?: string;
  stripePriceIdAnnual?: string;
  features: string[];
  limits: {
    maxMembers: number;
    maxMeetingsPerMonth: number;
    storageGB: number;
    hasAiMinutes: boolean;
    hasBankId: boolean;
    hasErpIntegration: boolean;
    hasMultiOrg: boolean;
  };
}

export const PRICE_PLANS: Record<SubscriptionTier, PricePlan> = {
  free: {
    tier: 'free',
    name: 'Free Trial',
    description: 'Try GovernanceOS free for 14 days',
    priceMonthly: 0,
    priceAnnual: 0,
    features: [
      'Up to 3 board members',
      '2 meetings per month',
      'Basic agenda management',
      'Document storage (100MB)',
    ],
    limits: {
      maxMembers: 3,
      maxMeetingsPerMonth: 2,
      storageGB: 0.1,
      hasAiMinutes: false,
      hasBankId: false,
      hasErpIntegration: false,
      hasMultiOrg: false,
    },
  },
  starter: {
    tier: 'starter',
    name: 'Starter',
    description: 'For small boards and startups',
    priceMonthly: 990,
    priceAnnual: 9900,
    stripePriceIdMonthly: process.env.STRIPE_PRICE_STARTER_MONTHLY,
    stripePriceIdAnnual: process.env.STRIPE_PRICE_STARTER_ANNUAL,
    features: [
      'Up to 7 board members',
      'Unlimited meetings',
      'AI-powered meeting minutes',
      'Decision register',
      'Document storage (5GB)',
    ],
    limits: {
      maxMembers: 7,
      maxMeetingsPerMonth: -1, // unlimited
      storageGB: 5,
      hasAiMinutes: true,
      hasBankId: false,
      hasErpIntegration: false,
      hasMultiOrg: false,
    },
  },
  professional: {
    tier: 'professional',
    name: 'Professional',
    description: 'For active boards with compliance needs',
    priceMonthly: 2490,
    priceAnnual: 24900,
    stripePriceIdMonthly: process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY,
    stripePriceIdAnnual: process.env.STRIPE_PRICE_PROFESSIONAL_ANNUAL,
    features: [
      'Up to 15 board members',
      'BankID digital signatures',
      'Jäv detection',
      'Full financial analytics',
      'ERP integration',
      'Document storage (25GB)',
    ],
    limits: {
      maxMembers: 15,
      maxMeetingsPerMonth: -1,
      storageGB: 25,
      hasAiMinutes: true,
      hasBankId: true,
      hasErpIntegration: true,
      hasMultiOrg: false,
    },
  },
  enterprise: {
    tier: 'enterprise',
    name: 'Enterprise',
    description: 'For large organizations and accounting firms',
    priceMonthly: 0, // Custom pricing
    priceAnnual: 0,
    features: [
      'Unlimited board members',
      'Multi-organization management',
      'Custom branding',
      'SSO/SAML',
      'API access',
      'Dedicated support',
    ],
    limits: {
      maxMembers: -1, // unlimited
      maxMeetingsPerMonth: -1,
      storageGB: -1,
      hasAiMinutes: true,
      hasBankId: true,
      hasErpIntegration: true,
      hasMultiOrg: true,
    },
  },
};

// ============================================================================
// CUSTOMER MANAGEMENT
// ============================================================================

/**
 * Create or retrieve a Stripe customer for a tenant
 */
export async function getOrCreateCustomer(
  tenantId: string,
  email: string,
  name: string,
  metadata?: Record<string, string>
): Promise<Stripe.Customer> {
  const stripeClient = getStripe();

  // Search for existing customer by tenant ID
  const existingCustomers = await stripeClient.customers.search({
    query: `metadata['tenantId']:'${tenantId}'`,
  });

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0];
  }

  // Create new customer
  const customer = await stripeClient.customers.create({
    email,
    name,
    metadata: {
      tenantId,
      ...metadata,
    },
  });

  return customer;
}

/**
 * Update customer information
 */
export async function updateCustomer(
  customerId: string,
  updates: Stripe.CustomerUpdateParams
): Promise<Stripe.Customer> {
  const stripeClient = getStripe();
  return stripeClient.customers.update(customerId, updates);
}

// ============================================================================
// SUBSCRIPTION MANAGEMENT
// ============================================================================

export interface CreateSubscriptionParams {
  tenantId: string;
  customerId: string;
  priceId: string;
  trialDays?: number;
}

/**
 * Create a new subscription
 */
export async function createSubscription(
  params: CreateSubscriptionParams
): Promise<Stripe.Subscription> {
  const stripeClient = getStripe();

  const subscriptionParams: Stripe.SubscriptionCreateParams = {
    customer: params.customerId,
    items: [{ price: params.priceId }],
    payment_behavior: 'default_incomplete',
    payment_settings: {
      save_default_payment_method: 'on_subscription',
    },
    expand: ['latest_invoice.payment_intent'],
    metadata: {
      tenantId: params.tenantId,
    },
  };

  if (params.trialDays && params.trialDays > 0) {
    subscriptionParams.trial_period_days = params.trialDays;
  }

  return stripeClient.subscriptions.create(subscriptionParams);
}

/**
 * Update subscription (e.g., change plan)
 */
export async function updateSubscription(
  subscriptionId: string,
  newPriceId: string
): Promise<Stripe.Subscription> {
  const stripeClient = getStripe();

  const subscription = await stripeClient.subscriptions.retrieve(subscriptionId);

  return stripeClient.subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: newPriceId,
      },
    ],
    proration_behavior: 'always_invoice',
  });
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  cancelAtPeriodEnd: boolean = true
): Promise<Stripe.Subscription> {
  const stripeClient = getStripe();

  if (cancelAtPeriodEnd) {
    return stripeClient.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  } else {
    return stripeClient.subscriptions.cancel(subscriptionId);
  }
}

/**
 * Resume a canceled subscription
 */
export async function resumeSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  const stripeClient = getStripe();
  return stripeClient.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
}

/**
 * Get subscription details
 */
export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  const stripeClient = getStripe();
  return stripeClient.subscriptions.retrieve(subscriptionId, {
    expand: ['default_payment_method', 'latest_invoice'],
  });
}

// ============================================================================
// CHECKOUT SESSIONS
// ============================================================================

export interface CreateCheckoutParams {
  tenantId: string;
  customerId?: string;
  email?: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  trialDays?: number;
}

/**
 * Create a Stripe Checkout session for new subscriptions
 */
export async function createCheckoutSession(
  params: CreateCheckoutParams
): Promise<Stripe.Checkout.Session> {
  const stripeClient = getStripe();

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    line_items: [
      {
        price: params.priceId,
        quantity: 1,
      },
    ],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: {
      tenantId: params.tenantId,
    },
    subscription_data: {
      metadata: {
        tenantId: params.tenantId,
      },
    },
    allow_promotion_codes: true,
    billing_address_collection: 'required',
    tax_id_collection: {
      enabled: true,
    },
  };

  if (params.customerId) {
    sessionParams.customer = params.customerId;
  } else if (params.email) {
    sessionParams.customer_email = params.email;
  }

  if (params.trialDays && params.trialDays > 0) {
    sessionParams.subscription_data!.trial_period_days = params.trialDays;
  }

  return stripeClient.checkout.sessions.create(sessionParams);
}

// ============================================================================
// BILLING PORTAL
// ============================================================================

/**
 * Create a billing portal session for customers to manage their subscription
 */
export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  const stripeClient = getStripe();

  return stripeClient.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

// ============================================================================
// PAYMENT METHODS
// ============================================================================

/**
 * Get customer's payment methods
 */
export async function getPaymentMethods(
  customerId: string
): Promise<Stripe.PaymentMethod[]> {
  const stripeClient = getStripe();

  const paymentMethods = await stripeClient.paymentMethods.list({
    customer: customerId,
    type: 'card',
  });

  return paymentMethods.data;
}

/**
 * Set default payment method
 */
export async function setDefaultPaymentMethod(
  customerId: string,
  paymentMethodId: string
): Promise<Stripe.Customer> {
  const stripeClient = getStripe();

  return stripeClient.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });
}

// ============================================================================
// INVOICES
// ============================================================================

/**
 * Get customer's invoices
 */
export async function getInvoices(
  customerId: string,
  limit: number = 10
): Promise<Stripe.Invoice[]> {
  const stripeClient = getStripe();

  const invoices = await stripeClient.invoices.list({
    customer: customerId,
    limit,
  });

  return invoices.data;
}

/**
 * Get upcoming invoice (prorated charges for plan changes)
 */
export async function getUpcomingInvoice(
  customerId: string,
  subscriptionId?: string,
  newPriceId?: string
): Promise<Stripe.Invoice> {
  const stripeClient = getStripe();

  const params: Stripe.InvoiceRetrieveUpcomingParams = {
    customer: customerId,
  };

  if (subscriptionId && newPriceId) {
    const subscription = await getSubscription(subscriptionId);
    params.subscription = subscriptionId;
    params.subscription_items = [
      {
        id: subscription.items.data[0].id,
        price: newPriceId,
      },
    ];
  }

  return stripeClient.invoices.retrieveUpcoming(params);
}

// ============================================================================
// WEBHOOK HANDLING
// ============================================================================

/**
 * Construct and verify webhook event
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const stripeClient = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }

  return stripeClient.webhooks.constructEvent(payload, signature, webhookSecret);
}

/**
 * Map Stripe subscription status to our status
 */
export function mapSubscriptionStatus(
  stripeStatus: Stripe.Subscription.Status
): 'active' | 'past_due' | 'cancelled' | 'trialing' {
  switch (stripeStatus) {
    case 'active':
      return 'active';
    case 'trialing':
      return 'trialing';
    case 'past_due':
    case 'unpaid':
      return 'past_due';
    case 'canceled':
    case 'incomplete':
    case 'incomplete_expired':
    case 'paused':
    default:
      return 'cancelled';
  }
}

/**
 * Get tier from Stripe price ID
 */
export function getTierFromPriceId(priceId: string): SubscriptionTier {
  for (const [tier, plan] of Object.entries(PRICE_PLANS)) {
    if (plan.stripePriceIdMonthly === priceId || plan.stripePriceIdAnnual === priceId) {
      return tier as SubscriptionTier;
    }
  }
  return 'starter'; // Default fallback
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format currency for display
 */
export function formatCurrency(
  amount: number,
  currency: string = 'SEK'
): string {
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Check if Stripe is configured
 */
export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_PUBLISHABLE_KEY;
}

/**
 * Get public Stripe key for client-side
 */
export function getPublishableKey(): string {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
}
