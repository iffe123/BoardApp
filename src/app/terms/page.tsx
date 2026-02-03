import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Navigation */}
      <nav className="border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center">
          <Link href="/" className="text-xl font-semibold tracking-tight">
            GovernanceOS
          </Link>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>

        <div className="prose prose-invert prose-lg max-w-none space-y-8 text-white/70">
          <p className="text-white/50 text-sm">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">1. Acceptance of Terms</h2>
            <p>
              By accessing or using GovernanceOS, you agree to be bound by these Terms of Service.
              If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">2. Description of Service</h2>
            <p>
              GovernanceOS is a board governance platform that provides tools for meeting management,
              document collaboration, financial oversight, and compliance tracking. The service is
              designed for corporate boards and organizations operating under Nordic governance
              requirements.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">3. User Accounts</h2>
            <p>You are responsible for:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized use</li>
              <li>Ensuring your account information is accurate and current</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">4. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe on the rights of others</li>
              <li>Upload malicious code or attempt to compromise system security</li>
              <li>Use the service for unauthorized commercial purposes</li>
              <li>Share your account credentials with unauthorized parties</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">5. Data Ownership</h2>
            <p>
              You retain ownership of all data you upload to GovernanceOS. We do not claim
              ownership of your content. You grant us a limited license to host, store, and
              display your content solely for the purpose of providing the service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">6. Subscription and Billing</h2>
            <p>
              Paid subscriptions are billed in advance on a monthly or annual basis.
              You may cancel your subscription at any time. Refunds are provided in accordance
              with our refund policy.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">7. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, GovernanceOS shall not be liable for any
              indirect, incidental, special, consequential, or punitive damages resulting from
              your use of the service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">8. Changes to Terms</h2>
            <p>
              We may update these terms from time to time. We will notify you of any material
              changes by posting the new terms on this page and updating the &quot;Last updated&quot; date.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">9. Governing Law</h2>
            <p>
              These terms shall be governed by and construed in accordance with the laws of
              Sweden, without regard to its conflict of law provisions.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">10. Contact</h2>
            <p>
              For questions about these Terms of Service, please contact us at
              legal@governanceos.com.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="max-w-4xl mx-auto px-6 text-center text-sm text-white/40">
          &copy; {new Date().getFullYear()} GovernanceOS. Built for the Nordic market.
        </div>
      </footer>
    </div>
  );
}
