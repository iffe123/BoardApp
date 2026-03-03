'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { useAuth } from '@/contexts/auth-context';
import { isDemoTenant, demoTenant } from '@/lib/demo-data';
import { Loader2, FlaskConical } from 'lucide-react';
import { auth } from '@/lib/firebase';

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


  const [checkingStepUp, setCheckingStepUp] = useState(true);

  useEffect(() => {
    const checkStepUp = async () => {
      if (!isAuthenticated || !tenantId) {
        setCheckingStepUp(false);
        return;
      }

      try {
        const currentUser = auth.currentUser;
        if (!currentUser) return;
        const token = await currentUser.getIdToken();
        const response = await fetch(`/api/auth/webauthn/status?tenantId=${tenantId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const payload = await response.json() as { required: boolean; isValid: boolean; policy?: { enforceForDashboard?: boolean } };
          if (payload.required && payload.policy?.enforceForDashboard !== false && !payload.isValid) {
            router.push(`/auth/webauthn-stepup?tenantId=${tenantId}`);
            return;
          }
        }
      } finally {
        setCheckingStepUp(false);
      }
    };

    void checkStepUp();
  }, [isAuthenticated, tenantId, router]);

  // Show loading state
  if (isLoading || checkingStepUp) {
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

  const isDemo = isDemoTenant(tenantId);

  return (
    <div className="app-shell flex h-screen bg-background">
      <Sidebar tenant={isDemo ? demoTenant : currentTenant} />
      <main className="flex-1 overflow-auto">
        {isDemo && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2 text-sm text-amber-800">
            <FlaskConical className="h-4 w-4" />
            <span>
              <strong>Demo mode</strong> &mdash; This is a test organization with sample data. Changes are not saved.
            </span>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
