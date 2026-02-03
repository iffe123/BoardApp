'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { useAuth } from '@/contexts/auth-context';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, isLoading, currentTenant, hasAccessToTenant, setCurrentTenant } = useAuth();
  const tenantId = params.tenantId as string;

  // Handle authentication and tenant access
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/auth/login');
        return;
      }

      if (tenantId && !hasAccessToTenant(tenantId)) {
        router.push('/dashboard');
        return;
      }

      // Set current tenant if different from URL
      if (tenantId && currentTenant?.id !== tenantId) {
        setCurrentTenant(tenantId);
      }
    }
  }, [isAuthenticated, isLoading, tenantId, hasAccessToTenant, currentTenant, setCurrentTenant, router]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-[#0a0a0a]">
      <Sidebar tenant={currentTenant} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
