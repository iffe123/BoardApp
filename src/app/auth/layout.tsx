'use client';

import React from 'react';
import Link from 'next/link';
import { Briefcase } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
      {/* Header */}
      <header className="p-4">
        <Link href="/" className="flex items-center gap-2 w-fit">
          <Briefcase className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold">GovernanceOS</span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        {children}
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} GovernanceOS. Built for the Nordic market.
      </footer>
    </div>
  );
}
