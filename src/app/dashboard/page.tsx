'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

/**
 * Dashboard Index Page
 *
 * Redirects to the user's current tenant dashboard or onboarding
 */
export default function DashboardIndexPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, currentTenantId, tenantClaims } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/auth/login');
        return;
      }

      // If user has a current tenant, redirect to that dashboard
      if (currentTenantId) {
        router.push(`/dashboard/${currentTenantId}`);
        return;
      }

      // If user has any tenants, redirect to the first one
      const tenantIds = Object.keys(tenantClaims);
      if (tenantIds.length > 0) {
        router.push(`/dashboard/${tenantIds[0]}`);
        return;
      }

      // No tenants, go to onboarding
      router.push('/onboarding');
    }
  }, [isAuthenticated, isLoading, currentTenantId, tenantClaims, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
