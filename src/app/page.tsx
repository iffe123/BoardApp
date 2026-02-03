'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Briefcase, Shield, BarChart3, Users, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, currentTenantId } = useAuth();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated && currentTenantId) {
      router.push(`/dashboard/${currentTenantId}`);
    }
  }, [isAuthenticated, isLoading, currentTenantId, router]);

  const features = [
    {
      icon: <Shield className="h-6 w-6" />,
      title: 'Nordic Compliance',
      description:
        'Built for Swedish corporate governance with Jäv detection, BankID signing, and adjuster workflows.',
    },
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: 'Financial Intelligence',
      description:
        'Real-time financial dashboards with ERP integration, automated KPIs, and AI-powered insights.',
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: 'Smart Meetings',
      description:
        'Drag-and-drop agenda builder, AI-generated minutes, and digital signature workflows.',
    },
  ];

  const benefits = [
    'AI-powered meeting minutes generation',
    'Conflict of interest (Jäv) detection',
    'Swedish BankID integration',
    'Real-time financial consolidation',
    'ERP integrations (Fortnox, Visma)',
    'Multi-organization management',
    'GDPR compliant with EU data residency',
    'Rolling 12-month financial analytics',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">GovernanceOS</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/auth/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/auth/signup">
              <Button>Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent">
          AI-Native Board Governance
          <br />
          for Modern Organizations
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          The complete platform for board meetings, financial oversight, and corporate
          compliance. Built for the Nordic market with Swedish governance requirements
          at its core.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/auth/signup">
            <Button size="lg" className="gap-2">
              Start Free Trial
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="#features">
            <Button size="lg" variant="outline">
              Learn More
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">
          Everything You Need for Board Excellence
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="rounded-lg bg-primary/10 text-primary p-3 w-fit mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Benefits List */}
      <section className="bg-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              Built for Swedish Corporate Governance
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="rounded-full bg-green-100 p-1">
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="bg-primary rounded-2xl p-12 text-primary-foreground">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Transform Your Board Management?
          </h2>
          <p className="text-lg opacity-90 mb-8 max-w-xl mx-auto">
            Join forward-thinking organizations using GovernanceOS to streamline
            their corporate governance.
          </p>
          <Link href="/auth/signup">
            <Button size="lg" variant="secondary" className="gap-2">
              Start Your Free Trial
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              <span className="font-semibold">GovernanceOS</span>
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} GovernanceOS. Built for the Nordic market.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
