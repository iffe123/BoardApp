'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, ArrowRight, Building2, Users, Zap, Shield, HelpCircle } from 'lucide-react';

interface PricingTier {
  name: string;
  id: 'free' | 'starter' | 'professional' | 'enterprise';
  price: {
    monthly: number;
    annual: number;
  };
  description: string;
  features: string[];
  highlighted?: boolean;
  cta: string;
  ctaLink: string;
}

const pricingTiers: PricingTier[] = [
  {
    name: 'Free Trial',
    id: 'free',
    price: { monthly: 0, annual: 0 },
    description: 'Try GovernanceOS free for 14 days. No credit card required.',
    features: [
      'Up to 3 board members',
      '2 meetings per month',
      'Basic agenda management',
      'Meeting minutes (manual)',
      'Document storage (100MB)',
      'Email support',
    ],
    cta: 'Start Free Trial',
    ctaLink: '/auth/signup',
  },
  {
    name: 'Starter',
    id: 'starter',
    price: { monthly: 990, annual: 9900 },
    description: 'Perfect for small boards and startups getting organized.',
    features: [
      'Up to 7 board members',
      'Unlimited meetings',
      'AI-powered meeting minutes',
      'Decision register',
      'Document storage (5GB)',
      'Basic financial dashboard',
      'Email notifications',
      'Standard support',
    ],
    cta: 'Get Started',
    ctaLink: '/auth/signup?plan=starter',
  },
  {
    name: 'Professional',
    id: 'professional',
    price: { monthly: 2490, annual: 24900 },
    description: 'For growing companies with active boards and compliance needs.',
    features: [
      'Up to 15 board members',
      'Everything in Starter, plus:',
      'BankID digital signatures',
      'Conflict of interest (Jäv) detection',
      'Full financial analytics',
      'Fortnox/Visma integration',
      'AI financial insights',
      'Audit trail & compliance',
      'Document storage (25GB)',
      'Priority support',
    ],
    highlighted: true,
    cta: 'Get Started',
    ctaLink: '/auth/signup?plan=professional',
  },
  {
    name: 'Enterprise',
    id: 'enterprise',
    price: { monthly: 0, annual: 0 },
    description: 'For large organizations and accounting firms managing multiple boards.',
    features: [
      'Unlimited board members',
      'Everything in Professional, plus:',
      'Multi-organization management',
      'Custom branding (white-label)',
      'SSO/SAML integration',
      'API access',
      'Custom integrations',
      'Dedicated account manager',
      'SLA guarantee (99.9%)',
      'On-premise option available',
    ],
    cta: 'Contact Sales',
    ctaLink: '/contact?type=enterprise',
  },
];

const faqs = [
  {
    question: 'Can I change plans later?',
    answer: 'Yes, you can upgrade or downgrade your plan at any time. When upgrading, you\'ll get immediate access to new features. When downgrading, changes take effect at the end of your billing period.',
  },
  {
    question: 'What happens after my free trial?',
    answer: 'After 14 days, you\'ll be prompted to choose a paid plan. Your data is preserved, and you can continue seamlessly. If you don\'t upgrade, your account becomes read-only.',
  },
  {
    question: 'Do you offer discounts for non-profits?',
    answer: 'Yes! Non-profit organizations, registered associations (ideella föreningar), and housing cooperatives (bostadsrättsföreningar) receive 30% off all plans. Contact us for verification.',
  },
  {
    question: 'Is my data secure?',
    answer: 'Absolutely. We use bank-level encryption, store data in EU data centers (GDPR compliant), and our infrastructure is SOC 2 certified. For Enterprise customers, we offer additional security certifications.',
  },
  {
    question: 'Can I pay with invoice?',
    answer: 'Invoice payment is available for annual Professional plans and all Enterprise customers. Starter plans require card payment.',
  },
  {
    question: 'What\'s included in BankID signatures?',
    answer: 'BankID digital signatures are legally binding under Swedish law (eIDAS compliant). Included in Professional and Enterprise plans with no per-signature fees.',
  },
];

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('annual');

  const formatPrice = (price: number) => {
    if (price === 0) return 'Free';
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold tracking-tight">
            GovernanceOS
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/auth/login"
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="text-sm px-4 py-2 bg-white text-black font-medium rounded hover:bg-white/90 transition-colors"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            Simple, transparent pricing
          </h1>
          <p className="text-xl text-white/50 mb-10">
            Start with a 14-day free trial. No credit card required.
            <br />
            Choose the plan that fits your board&apos;s needs.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-4 p-1.5 bg-white/5 rounded-full border border-white/10">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                billingPeriod === 'monthly'
                  ? 'bg-white text-black'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('annual')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                billingPeriod === 'annual'
                  ? 'bg-white text-black'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Annual
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                billingPeriod === 'annual'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-emerald-500/20 text-emerald-400'
              }`}>
                Save 17%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {pricingTiers.map((tier) => (
              <div
                key={tier.id}
                className={`relative flex flex-col rounded-2xl border p-8 ${
                  tier.highlighted
                    ? 'border-blue-500 bg-blue-500/5'
                    : 'border-white/10 bg-white/[0.02]'
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-500 text-white text-sm font-medium rounded-full">
                    Most Popular
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-xl font-semibold mb-2">{tier.name}</h3>
                  <p className="text-sm text-white/50">{tier.description}</p>
                </div>

                <div className="mb-6">
                  {tier.id === 'enterprise' ? (
                    <div className="text-3xl font-bold">Custom</div>
                  ) : tier.id === 'free' ? (
                    <div className="text-3xl font-bold">Free</div>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold">
                          {formatPrice(billingPeriod === 'monthly' ? tier.price.monthly : tier.price.annual / 12)}
                        </span>
                        <span className="text-white/40">/month</span>
                      </div>
                      {billingPeriod === 'annual' && (
                        <p className="text-sm text-white/40 mt-1">
                          {formatPrice(tier.price.annual)} billed annually
                        </p>
                      )}
                    </>
                  )}
                </div>

                <ul className="flex-1 space-y-3 mb-8">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3 text-sm">
                      <Check className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span className="text-white/70">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={tier.ctaLink}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all ${
                    tier.highlighted
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : tier.id === 'enterprise'
                      ? 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                      : 'bg-white text-black hover:bg-white/90'
                  }`}
                >
                  {tier.cta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="py-24 px-6 border-t border-white/10">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16">Compare all features</h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-4 font-medium text-white/50">Feature</th>
                  <th className="text-center py-4 px-4 font-medium">Free</th>
                  <th className="text-center py-4 px-4 font-medium">Starter</th>
                  <th className="text-center py-4 px-4 font-medium text-blue-400">Professional</th>
                  <th className="text-center py-4 px-4 font-medium">Enterprise</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {[
                  { feature: 'Board members', free: '3', starter: '7', professional: '15', enterprise: 'Unlimited' },
                  { feature: 'Meetings per month', free: '2', starter: 'Unlimited', professional: 'Unlimited', enterprise: 'Unlimited' },
                  { feature: 'AI meeting minutes', free: false, starter: true, professional: true, enterprise: true },
                  { feature: 'Decision register', free: false, starter: true, professional: true, enterprise: true },
                  { feature: 'BankID signatures', free: false, starter: false, professional: true, enterprise: true },
                  { feature: 'Jäv detection', free: false, starter: false, professional: true, enterprise: true },
                  { feature: 'Financial dashboard', free: false, starter: 'Basic', professional: 'Full', enterprise: 'Full' },
                  { feature: 'ERP integration', free: false, starter: false, professional: true, enterprise: true },
                  { feature: 'Document storage', free: '100MB', starter: '5GB', professional: '25GB', enterprise: 'Unlimited' },
                  { feature: 'Audit trail', free: false, starter: false, professional: true, enterprise: true },
                  { feature: 'Multi-org management', free: false, starter: false, professional: false, enterprise: true },
                  { feature: 'API access', free: false, starter: false, professional: false, enterprise: true },
                  { feature: 'SSO/SAML', free: false, starter: false, professional: false, enterprise: true },
                  { feature: 'White-label', free: false, starter: false, professional: false, enterprise: true },
                ].map((row, index) => (
                  <tr key={index} className="border-b border-white/5">
                    <td className="py-4 px-4 text-white/70">{row.feature}</td>
                    {['free', 'starter', 'professional', 'enterprise'].map((plan) => {
                      const value = row[plan as keyof typeof row];
                      return (
                        <td key={plan} className={`text-center py-4 px-4 ${plan === 'professional' ? 'bg-blue-500/5' : ''}`}>
                          {typeof value === 'boolean' ? (
                            value ? (
                              <Check className="h-5 w-5 text-emerald-400 mx-auto" />
                            ) : (
                              <span className="text-white/20">—</span>
                            )
                          ) : (
                            <span className="text-white/70">{value}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-16 px-6 border-t border-white/10">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                <Shield className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="font-medium mb-2">GDPR Compliant</h3>
              <p className="text-sm text-white/50">EU data residency with full GDPR compliance</p>
            </div>
            <div>
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="font-medium mb-2">Swedish Built</h3>
              <p className="text-sm text-white/50">Designed for Swedish corporate governance</p>
            </div>
            <div>
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                <Zap className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="font-medium mb-2">99.9% Uptime</h3>
              <p className="text-sm text-white/50">Enterprise-grade reliability and performance</p>
            </div>
            <div>
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="font-medium mb-2">500+ Boards</h3>
              <p className="text-sm text-white/50">Trusted by Nordic organizations</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-24 px-6 border-t border-white/10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Frequently asked questions</h2>
          <p className="text-center text-white/50 mb-12">
            Can&apos;t find what you&apos;re looking for?{' '}
            <Link href="/contact" className="text-blue-400 hover:underline">Contact our team</Link>
          </p>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <details
                key={index}
                className="group border border-white/10 rounded-xl bg-white/[0.02] overflow-hidden"
              >
                <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                  <span className="font-medium pr-4">{faq.question}</span>
                  <HelpCircle className="h-5 w-5 text-white/40 flex-shrink-0 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="px-6 pb-6 text-white/60">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 border-t border-white/10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to modernize your board?</h2>
          <p className="text-xl text-white/50 mb-8">
            Join 500+ Nordic organizations using GovernanceOS
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-black font-medium rounded-lg hover:bg-white/90 transition-all"
            >
              Start Free Trial
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/contact?type=demo"
              className="inline-flex items-center gap-2 px-8 py-4 border border-white/20 text-white font-medium rounded-lg hover:bg-white/5 transition-all"
            >
              Book a Demo
            </Link>
          </div>
          <p className="text-sm text-white/40 mt-6">
            14-day free trial • No credit card required • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-8">
              <span className="text-lg font-semibold">GovernanceOS</span>
              <div className="hidden md:flex items-center gap-6 text-sm text-white/40">
                <Link href="/" className="hover:text-white transition-colors">Home</Link>
                <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
                <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
                <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
              </div>
            </div>
            <p className="text-sm text-white/40">
              &copy; {new Date().getFullYear()} GovernanceOS. Built for the Nordic market.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
