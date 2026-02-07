'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, ChevronRight } from 'lucide-react';
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

  const platforms = [
    {
      number: '01',
      title: 'Intelligent Meetings',
      description: 'AI-powered agenda management, real-time collaboration, and automated minutes generation.',
    },
    {
      number: '02',
      title: 'Financial Oversight',
      description: 'Real-time dashboards, ERP integration, and rolling 12-month analytics with AI insights.',
    },
    {
      number: '03',
      title: 'Compliance Engine',
      description: 'Swedish governance built-in. Jäv detection, BankID signatures, and full audit trails.',
    },
  ];

  const capabilities = [
    'AI-Generated Minutes',
    'Conflict of Interest Detection',
    'BankID Digital Signatures',
    'Real-time Financial Consolidation',
    'ERP Integration (Fortnox, Visma)',
    'Multi-Organization Management',
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-12">
            <Link href="/" className="text-xl font-semibold tracking-tight">
              GovernanceOS
            </Link>
            <div className="hidden md:flex items-center gap-8 text-sm text-white/60">
              <Link href="#platform" className="hover:text-white transition-colors">Platform</Link>
              <Link href="#capabilities" className="hover:text-white transition-colors">Capabilities</Link>
              <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
              <Link href="#enterprise" className="hover:text-white transition-colors">Enterprise</Link>
            </div>
          </div>
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
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-16">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-950/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.1),transparent_70%)]" />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
            backgroundSize: '100px 100px'
          }}
        />

        <div className="relative max-w-7xl mx-auto px-6 py-32 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 text-sm text-white/60 mb-8">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Now available for Nordic enterprises
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8 leading-[0.9]">
            Board Governance
            <br />
            <span className="text-white/40">Reimagined</span>
          </h1>

          <p className="text-xl md:text-2xl text-white/50 max-w-3xl mx-auto mb-12 leading-relaxed">
            The AI-native platform for modern board management. Built for Swedish
            corporate governance with intelligence at its core.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/signup"
              className="group inline-flex items-center gap-3 px-8 py-4 bg-white text-black font-medium rounded hover:bg-white/90 transition-all"
            >
              Start Free Trial
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="#platform"
              className="inline-flex items-center gap-3 px-8 py-4 border border-white/20 text-white font-medium rounded hover:bg-white/5 transition-all"
            >
              Explore Platform
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2">
          <div className="w-px h-16 bg-gradient-to-b from-transparent via-white/20 to-transparent" />
        </div>
      </section>

      {/* Platform Section */}
      <section id="platform" className="py-32 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-20">
            <p className="text-sm text-white/40 uppercase tracking-widest mb-4">Platform</p>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight max-w-3xl">
              Three pillars of intelligent governance
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-px bg-white/10 rounded-lg overflow-hidden">
            {platforms.map((platform) => (
              <div
                key={platform.number}
                className="bg-[#0a0a0a] p-10 hover:bg-white/[0.02] transition-colors group"
              >
                <span className="text-6xl font-bold text-white/10 group-hover:text-white/20 transition-colors">
                  {platform.number}
                </span>
                <h3 className="text-2xl font-semibold mt-6 mb-4">{platform.title}</h3>
                <p className="text-white/50 leading-relaxed mb-6">{platform.description}</p>
                <Link
                  href="/auth/signup"
                  className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
                >
                  Learn more <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities Section */}
      <section id="capabilities" className="py-32 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div>
              <p className="text-sm text-white/40 uppercase tracking-widest mb-4">Capabilities</p>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-8">
                Built for Swedish
                <br />
                <span className="text-white/40">corporate governance</span>
              </h2>
              <p className="text-lg text-white/50 leading-relaxed mb-12">
                Every feature designed with Nordic compliance requirements in mind.
                From Jäv detection to BankID signatures, we handle the complexity
                so you can focus on governance.
              </p>
              <Link
                href="/auth/signup"
                className="group inline-flex items-center gap-3 px-6 py-3 bg-white text-black font-medium rounded hover:bg-white/90 transition-all"
              >
                Get Started
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {capabilities.map((capability, index) => (
                <div
                  key={index}
                  className="p-6 border border-white/10 rounded-lg hover:border-white/20 hover:bg-white/[0.02] transition-all"
                >
                  <span className="text-sm text-white/80">{capability}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Enterprise Section */}
      <section id="enterprise" className="py-32 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent p-12 md:p-20 overflow-hidden">
            {/* Background accent */}
            <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-500/10 to-transparent" />

            <div className="relative max-w-2xl">
              <p className="text-sm text-white/40 uppercase tracking-widest mb-4">Enterprise</p>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
                Ready for the
                <br />
                modern boardroom
              </h2>
              <p className="text-lg text-white/50 leading-relaxed mb-10">
                GDPR compliant with EU data residency. SOC 2 certified infrastructure.
                Deployed by leading Nordic organizations.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/auth/signup"
                  className="group inline-flex items-center justify-center gap-3 px-8 py-4 bg-white text-black font-medium rounded hover:bg-white/90 transition-all"
                >
                  Start Free Trial
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <button
                  className="inline-flex items-center justify-center gap-3 px-8 py-4 border border-white/20 text-white font-medium rounded hover:bg-white/5 transition-all"
                >
                  Contact Sales
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-8">
              <span className="text-lg font-semibold">GovernanceOS</span>
              <div className="hidden md:flex items-center gap-6 text-sm text-white/40">
                <Link href="#platform" className="hover:text-white transition-colors">Platform</Link>
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
