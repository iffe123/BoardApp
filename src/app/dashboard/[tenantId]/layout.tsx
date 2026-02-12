'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, isLoading, currentTenant, setCurrentTenant } = useAuth();
  const tenantId = params.tenantId as string;

  // Handle authentication and tenant access
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/auth/login');
        return;
      }

      // Set current tenant if different from URL.
      // setCurrentTenant will refresh claims from Firestore if needed,
      // so this works even right after org creation.
      if (tenantId && currentTenant?.id !== tenantId) {
        setCurrentTenant(tenantId);
      }
    }
  }, [isAuthenticated, isLoading, tenantId, currentTenant, setCurrentTenant, router]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background dashboard-light-fonts">
      <Sidebar tenant={currentTenant} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
