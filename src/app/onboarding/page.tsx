'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Briefcase, Users, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Briefcase className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome to GovernanceOS</CardTitle>
          <CardDescription>
            Let&apos;s set up your organization to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center py-4">
                <h3 className="font-semibold mb-2">What would you like to do?</h3>
                <p className="text-sm text-muted-foreground">
                  Choose how you want to get started with GovernanceOS
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start h-auto py-4"
                  onClick={() => setStep(2)}
                >
                  <Building2 className="h-5 w-5 mr-3" />
                  <div className="text-left">
                    <p className="font-medium">Create a new organization</p>
                    <p className="text-xs text-muted-foreground">
                      Set up your company or board
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 ml-auto" />
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start h-auto py-4"
                  disabled
                >
                  <Users className="h-5 w-5 mr-3" />
                  <div className="text-left">
                    <p className="font-medium">Join an existing organization</p>
                    <p className="text-xs text-muted-foreground">
                      You&apos;ll need an invitation from an admin
                    </p>
                  </div>
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              {error && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="orgName">Organization Name</Label>
                  <Input
                    id="orgName"
                    placeholder="Acme AB"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    leftIcon={<Building2 className="h-4 w-4" />}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="orgNumber">
                    Organization Number <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="orgNumber"
                    placeholder="556123-4567"
                    value={orgNumber}
                    onChange={(e) => setOrgNumber(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Swedish organization number (organisationsnummer)
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Back
                </Button>
                <Button
                  onClick={handleCreateOrganization}
                  isLoading={isSubmitting}
                  className="flex-1"
                >
                  Create Organization
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
