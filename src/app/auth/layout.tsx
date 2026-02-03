'use client';

import React from 'react';
import Link from 'next/link';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Background effects */}
      <div className="fixed inset-0 bg-gradient-to-b from-blue-950/20 via-transparent to-transparent pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.1),transparent_50%)] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 p-6">
        <Link href="/" className="flex items-center gap-2 w-fit text-white">
          <span className="text-xl font-semibold tracking-tight">GovernanceOS</span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4">
        {children}
      </main>

      {/* Footer */}
      <footer className="relative z-10 p-6 text-center text-sm text-white/40">
        &copy; {new Date().getFullYear()} GovernanceOS. Built for the Nordic market.
      </footer>
    </div>
  );
}
