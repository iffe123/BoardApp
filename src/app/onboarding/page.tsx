'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Building2, Users, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { collections, Timestamp, writeBatch, db } from '@/lib/firebase';
import type { Tenant, Member } from '@/types/schema';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, currentTenantId, tenantClaims } = useAuth();

  const [step, setStep] = useState(1);
  const [orgName, setOrgName] = useState('');
  const [orgNumber, setOrgNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already has a tenant
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/auth/login');
        return;
      }

      // If user already has tenants, redirect to dashboard
      if (Object.keys(tenantClaims).length > 0 && currentTenantId) {
        router.push(`/dashboard/${currentTenantId}`);
      }
    }
  }, [isAuthenticated, isLoading, tenantClaims, currentTenantId, router]);

  const handleCreateOrganization = async () => {
    if (!orgName.trim()) {
      setError('Please enter an organization name');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Generate a tenant ID
      const tenantId = `tenant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create the tenant document
      const tenant: Omit<Tenant, 'id'> = {
        name: orgName.trim(),
        organizationNumber: orgNumber.trim() || undefined,
        subscription: {
          tier: 'starter',
          status: 'trialing',
          currentPeriodEnd: Timestamp.fromDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)),
        },
        settings: {
          defaultLanguage: 'sv',
          fiscalYearStart: 1,
          requireBankIdSigning: true,
          allowGuestObservers: false,
          autoGenerateMinutes: true,
          meetingReminderDays: 7,
        },
        createdBy: user?.uid || '',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      // Create tenant and member in a batch
      const batch = writeBatch(db);

      // Add tenant document
      batch.set(collections.tenant(tenantId), tenant);

      // Add current user as owner member
      const member: Omit<Member, 'id'> = {
        tenantId: tenantId,
        userId: user?.uid || '',
        role: 'owner',
        joinedAt: Timestamp.now(),
        permissions: {
          canCreateMeetings: true,
          canManageMembers: true,
          canAccessFinancials: true,
          canSignDocuments: true,
          canManageDocuments: true,
        },
        conflicts: [],
        isActive: true,
        invitedAt: Timestamp.now(),
        acceptedAt: Timestamp.now(),
      };
      batch.set(collections.member(tenantId, user?.uid || ''), member);

      await batch.commit();

      // Store tenant ID in localStorage for immediate access
      localStorage.setItem('governanceos_current_tenant', tenantId);
      localStorage.setItem('governanceos_pending_tenant', tenantId);

      // Redirect to dashboard
      router.push(`/dashboard/${tenantId}`);
    } catch (err) {
      console.error('Error creating organization:', err);
      setError('Failed to create organization. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

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
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/5 border border-white/10 mb-6">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Welcome to GovernanceOS</h1>
            <p className="text-white/50">Let&apos;s set up your organization to get started</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-8 backdrop-blur-sm">
            {step === 1 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="font-semibold text-white mb-2">What would you like to do?</h3>
                  <p className="text-sm text-white/50">
                    Choose how you want to get started with GovernanceOS
                  </p>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => setStep(2)}
                    className="w-full flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-white/20 transition-all group"
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
                      <Building2 className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-white">Create a new organization</p>
                      <p className="text-xs text-white/50">
                        Set up your company or board
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-white/60 transition-colors" />
                  </button>

                  <button
                    disabled
                    className="w-full flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-lg opacity-50 cursor-not-allowed"
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/5">
                      <Users className="w-5 h-5 text-white/50" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-white/50">Join an existing organization</p>
                      <p className="text-xs text-white/40">
                        You&apos;ll need an invitation from an admin
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                {error && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="orgName" className="block text-sm font-medium text-white/70">
                      Organization Name
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                      <input
                        id="orgName"
                        type="text"
                        placeholder="Acme AB"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="orgNumber" className="block text-sm font-medium text-white/70">
                      Organization Number <span className="text-white/40">(optional)</span>
                    </label>
                    <input
                      id="orgNumber"
                      type="text"
                      placeholder="556123-4567"
                      value={orgNumber}
                      onChange={(e) => setOrgNumber(e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
                    />
                    <p className="text-xs text-white/40">
                      Swedish organization number (organisationsnummer)
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/10 text-white font-medium rounded-lg hover:bg-white/10 transition-all"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </button>
                  <button
                    onClick={handleCreateOrganization}
                    disabled={isSubmitting}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-white text-black font-medium rounded-lg hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                    ) : (
                      <>
                        Create
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 p-6 text-center text-sm text-white/40">
        &copy; {new Date().getFullYear()} GovernanceOS. Built for the Nordic market.
      </footer>
    </div>
  );
}
