'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  Building2,
  CreditCard,
  Shield,
  Link2,
  Bell,
  Save,
  ExternalLink,
  Check,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useAuth, usePermissions } from '@/contexts/auth-context';
import type { SubscriptionTier } from '@/types/schema';

// Billing Section Component
interface BillingSectionProps {
  tenantId: string;
  subscription?: {
    tier: SubscriptionTier;
    status: 'active' | 'past_due' | 'cancelled' | 'trialing';
    currentPeriodEnd: { toDate: () => Date };
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
  };
  userEmail?: string;
}

const PLAN_DETAILS: Record<SubscriptionTier, { name: string; price: number; members: number; features: string[] }> = {
  free: { name: 'Free Trial', price: 0, members: 3, features: ['Basic features', '14-day trial'] },
  starter: { name: 'Starter', price: 990, members: 7, features: ['AI meeting minutes', 'Decision register', '5GB storage'] },
  professional: { name: 'Professional', price: 2490, members: 15, features: ['BankID signatures', 'Jäv detection', 'ERP integration', '25GB storage'] },
  enterprise: { name: 'Enterprise', price: 0, members: -1, features: ['Unlimited members', 'Multi-org', 'SSO', 'Custom branding'] },
};

function BillingSection({ tenantId, subscription, userEmail }: BillingSectionProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [isPortalLoading, setIsPortalLoading] = React.useState(false);

  const currentTier = subscription?.tier || 'free';
  const planDetails = PLAN_DETAILS[currentTier];
  const isTrialing = subscription?.status === 'trialing';
  const isPastDue = subscription?.status === 'past_due';
  const periodEnd = subscription?.currentPeriodEnd?.toDate();

  const handleUpgrade = async (tier: SubscriptionTier) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          tier,
          billingPeriod: 'annual',
          email: userEmail,
          customerId: subscription?.stripeCustomerId,
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else if (data.setupRequired) {
        alert('Payment system is being configured. Please try again later or contact support.');
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageBilling = async () => {
    if (!subscription?.stripeCustomerId) {
      alert('No billing account found. Please upgrade your plan first.');
      return;
    }

    setIsPortalLoading(true);
    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: subscription.stripeCustomerId,
          returnUrl: window.location.href,
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to open billing portal');
      }
    } catch (error) {
      console.error('Billing portal error:', error);
      alert('Failed to open billing portal. Please try again.');
    } finally {
      setIsPortalLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    if (price === 0) return 'Free';
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>
            Manage your subscription and billing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className={`flex items-center justify-between p-6 rounded-lg border-2 ${
            isPastDue ? 'border-destructive bg-destructive/5' : 'border-primary bg-primary/5'
          }`}>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge className={isPastDue ? 'bg-destructive' : ''}>
                  {planDetails.name}
                </Badge>
                {isTrialing && (
                  <Badge variant="outline" className="bg-amber-100 text-amber-800">
                    Trial
                  </Badge>
                )}
                {isPastDue && (
                  <Badge variant="outline" className="bg-red-100 text-red-800">
                    Payment Required
                  </Badge>
                )}
              </div>
              <p className="text-2xl font-bold">
                {currentTier === 'enterprise' ? 'Custom Pricing' : `${formatPrice(planDetails.price)}/month`}
              </p>
              <p className="text-sm text-muted-foreground">
                {planDetails.members === -1 ? 'Unlimited' : `Up to ${planDetails.members}`} board members
              </p>
            </div>
            {currentTier !== 'enterprise' && (
              <Button
                variant={isPastDue ? 'destructive' : 'outline'}
                onClick={() => handleUpgrade(currentTier === 'starter' ? 'professional' : 'starter')}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                {isPastDue ? 'Update Payment' : 'Upgrade Plan'}
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>

          {periodEnd && (
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {isTrialing ? 'Trial ends' : 'Next billing date'}
                </span>
                <span className="font-medium">
                  {periodEnd.toLocaleDateString('sv-SE', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
              {subscription?.stripeCustomerId && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Billing account</span>
                  <span className="font-medium">Connected</span>
                </div>
              )}
            </div>
          )}

          {subscription?.stripeCustomerId && (
            <div className="mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={handleManageBilling}
                disabled={isPortalLoading}
              >
                {isPortalLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4 mr-2" />
                )}
                Manage Billing & Invoices
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plan Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Available Plans</CardTitle>
          <CardDescription>
            Compare features and choose the right plan for your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {(['starter', 'professional', 'enterprise'] as SubscriptionTier[]).map((tier) => {
              const plan = PLAN_DETAILS[tier];
              const isCurrent = tier === currentTier;

              return (
                <div
                  key={tier}
                  className={`p-4 rounded-lg border ${
                    isCurrent ? 'border-primary bg-primary/5' : 'border-muted'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{plan.name}</h4>
                    {isCurrent && <Badge variant="secondary">Current</Badge>}
                  </div>
                  <p className="text-xl font-bold mb-2">
                    {tier === 'enterprise' ? 'Custom' : `${formatPrice(plan.price)}/mo`}
                  </p>
                  <ul className="space-y-1 text-sm text-muted-foreground mb-4">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <Check className="h-3 w-3 text-green-600" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  {!isCurrent && (
                    <Button
                      variant={tier === 'enterprise' ? 'outline' : 'default'}
                      size="sm"
                      className="w-full"
                      onClick={() => tier === 'enterprise'
                        ? window.location.href = '/contact?type=enterprise'
                        : handleUpgrade(tier)
                      }
                      disabled={isLoading}
                    >
                      {tier === 'enterprise' ? 'Contact Sales' : 'Upgrade'}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Usage Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Usage</CardTitle>
          <CardDescription>
            Current usage for this billing period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span>Board Members</span>
                <span>
                  6 of {planDetails.members === -1 ? '∞' : planDetails.members}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary transition-all"
                  style={{ width: planDetails.members === -1 ? '10%' : `${Math.min(100, (6 / planDetails.members) * 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span>Storage</span>
                <span>2.4 GB of {currentTier === 'free' ? '100 MB' : currentTier === 'starter' ? '5 GB' : currentTier === 'professional' ? '25 GB' : '∞'}</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div className="h-2 rounded-full bg-primary" style={{ width: '24%' }} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span>Meetings This Month</span>
                <span>8 {currentTier === 'free' ? 'of 2' : '(unlimited)'}</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div className="h-2 rounded-full bg-primary" style={{ width: currentTier === 'free' ? '100%' : '30%' }} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const { currentTenant, user, userProfile, setCurrentTenant } = useAuth();
  const { isAdmin, isOwner } = usePermissions();

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state - Organization
  const [orgName, setOrgName] = useState('');
  const [orgNumber, setOrgNumber] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [defaultLanguage, setDefaultLanguage] = useState('sv-SE');
  const [timezone, setTimezone] = useState('Europe/Stockholm');
  const [currency, setCurrency] = useState('SEK');
  const [fiscalYearStart, setFiscalYearStart] = useState('1');

  // Meeting defaults
  const [defaultMeetingDuration, setDefaultMeetingDuration] = useState('120');
  const [defaultQuorum, setDefaultQuorum] = useState('3');
  const [requireAdjuster, setRequireAdjuster] = useState(true);
  const [autoGenerateMinutes, setAutoGenerateMinutes] = useState(true);

  // Notifications
  const [meetingReminderTiming, setMeetingReminderTiming] = useState('24,2');
  const [agendaUpdatesEnabled, setAgendaUpdatesEnabled] = useState(true);
  const [minutesReadyEnabled, setMinutesReadyEnabled] = useState(true);
  const [newDocumentsEnabled, setNewDocumentsEnabled] = useState(true);
  const [signatureRequestsEnabled, setSignatureRequestsEnabled] = useState(true);
  const [taskAssignmentsEnabled, setTaskAssignmentsEnabled] = useState(true);
  const [dueDateReminderDays, setDueDateReminderDays] = useState('3');

  // Compliance
  const [documentRetentionYears, setDocumentRetentionYears] = useState('7');

  // Load settings
  useEffect(() => {
    if (currentTenant) {
      setOrgName(currentTenant.name || '');
      setOrgNumber(currentTenant.organizationNumber || '');
      setWebsite(currentTenant.website || '');
      setAddress(
        currentTenant.address
          ? `${currentTenant.address.street}\n${currentTenant.address.city}, ${currentTenant.address.postalCode}\n${currentTenant.address.country}`
          : ''
      );
      setDefaultLanguage(currentTenant.settings?.defaultLanguage || 'sv-SE');
      setFiscalYearStart(String(currentTenant.settings?.fiscalYearStart || 1));

      // Load meeting defaults from tenant settings
      const settings = currentTenant.settings || {};
      setAutoGenerateMinutes(settings.autoGenerateMinutes ?? true);
      setRequireAdjuster(settings.requireBankIdSigning ?? true);
      setDefaultMeetingDuration(String((settings as Record<string, unknown>).defaultMeetingDuration || 120));
      setDefaultQuorum(String((settings as Record<string, unknown>).defaultQuorum || 3));

      // Load notification settings
      const notifications = (settings as Record<string, unknown>).notifications as Record<string, unknown> || {};
      setMeetingReminderTiming(String(notifications.meetingReminderTiming || '24,2'));
      setAgendaUpdatesEnabled(notifications.agendaUpdates !== false);
      setMinutesReadyEnabled(notifications.minutesReady !== false);
      setNewDocumentsEnabled(notifications.newDocuments !== false);
      setSignatureRequestsEnabled(notifications.signatureRequests !== false);
      setTaskAssignmentsEnabled(notifications.taskAssignments !== false);
      setDueDateReminderDays(String(notifications.dueDateReminderDays || 3));

      // Load compliance settings
      const compliance = (settings as Record<string, unknown>).compliance as Record<string, unknown> || {};
      setDocumentRetentionYears(String(compliance.documentRetentionYears || 7));
    }
  }, [currentTenant]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      // Parse address
      const addressLines = address.split('\n').map(line => line.trim());
      const parsedAddress = addressLines.length >= 2 ? {
        street: addressLines[0] || '',
        city: addressLines[1]?.split(',')[0]?.trim() || '',
        postalCode: addressLines[1]?.split(',')[1]?.trim() || '',
        country: addressLines[2] || 'Sweden',
      } : undefined;

      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          userId: user?.uid,
          userName: userProfile?.displayName || user?.displayName || 'Unknown',
          updates: {
            name: orgName,
            organizationNumber: orgNumber,
            website,
            address: parsedAddress,
            settings: {
              defaultLanguage,
              fiscalYearStart: parseInt(fiscalYearStart),
              autoGenerateMinutes,
              requireBankIdSigning: requireAdjuster,
              defaultMeetingDuration: parseInt(defaultMeetingDuration),
              defaultQuorum: parseInt(defaultQuorum),
              notifications: {
                meetingReminderTiming,
                agendaUpdates: agendaUpdatesEnabled,
                minutesReady: minutesReadyEnabled,
                newDocuments: newDocumentsEnabled,
                signatureRequests: signatureRequestsEnabled,
                taskAssignments: taskAssignmentsEnabled,
                dueDateReminderDays: parseInt(dueDateReminderDays),
              },
              compliance: {
                documentRetentionYears: parseInt(documentRetentionYears),
              },
            },
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save settings');
      }

      setSaveSuccess(true);

      // Refresh tenant data by re-setting current tenant
      if (tenantId) {
        await setCurrentTenant(tenantId);
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  }, [
    tenantId, user, userProfile, orgName, orgNumber, website, address,
    defaultLanguage, fiscalYearStart, autoGenerateMinutes, requireAdjuster,
    defaultMeetingDuration, defaultQuorum, meetingReminderTiming,
    agendaUpdatesEnabled, minutesReadyEnabled, newDocumentsEnabled,
    signatureRequestsEnabled, taskAssignmentsEnabled, dueDateReminderDays,
    documentRetentionYears, setCurrentTenant
  ]);

  if (!isAdmin) {
    return (
      <div className="p-8">
        <Card className="p-12 text-center">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
          <p className="text-muted-foreground">
            You need administrator privileges to access settings.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your organization settings and integrations
        </p>
      </div>

      <Tabs defaultValue="organization">
        <TabsList className="mb-6">
          <TabsTrigger value="organization">
            <Building2 className="h-4 w-4 mr-2" />
            Organization
          </TabsTrigger>
          <TabsTrigger value="integrations">
            <Link2 className="h-4 w-4 mr-2" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="compliance">
            <Shield className="h-4 w-4 mr-2" />
            Compliance
          </TabsTrigger>
          {isOwner && (
            <TabsTrigger value="billing">
              <CreditCard className="h-4 w-4 mr-2" />
              Billing
            </TabsTrigger>
          )}
        </TabsList>

        {/* Organization Settings */}
        <TabsContent value="organization">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Organization Details</CardTitle>
                <CardDescription>
                  Basic information about your organization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="orgName">Organization Name</Label>
                    <Input
                      id="orgName"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="Acme AB"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="orgNumber">Organization Number</Label>
                    <Input
                      id="orgNumber"
                      value={orgNumber}
                      onChange={(e) => setOrgNumber(e.target.value)}
                      placeholder="556123-4567"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    placeholder="https://example.com"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    placeholder="Street Address&#10;City, Postal Code&#10;Country"
                    rows={3}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>

                {error && (
                  <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                    {error}
                  </div>
                )}

                {saveSuccess && (
                  <div className="p-3 rounded-md bg-green-100 text-green-800 text-sm flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    Settings saved successfully
                  </div>
                )}

                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Meeting Defaults</CardTitle>
                <CardDescription>
                  Default settings for new meetings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Default Meeting Duration</Label>
                    <Select value={defaultMeetingDuration} onValueChange={setDefaultMeetingDuration}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="90">1.5 hours</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                        <SelectItem value="180">3 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Default Quorum</Label>
                    <Select value={defaultQuorum} onValueChange={setDefaultQuorum}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2 members</SelectItem>
                        <SelectItem value="3">3 members</SelectItem>
                        <SelectItem value="4">4 members</SelectItem>
                        <SelectItem value="5">5 members</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <p className="font-medium">Require Meeting Adjuster</p>
                    <p className="text-sm text-muted-foreground">
                      Swedish compliance requirement (Justerare)
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRequireAdjuster(!requireAdjuster)}
                    className={requireAdjuster ? 'bg-green-100 text-green-800 hover:bg-green-200' : ''}
                  >
                    {requireAdjuster ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <p className="font-medium">Auto-generate Meeting Minutes</p>
                    <p className="text-sm text-muted-foreground">
                      Use AI to generate draft minutes after meetings
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAutoGenerateMinutes(!autoGenerateMinutes)}
                    className={autoGenerateMinutes ? 'bg-green-100 text-green-800 hover:bg-green-200' : ''}
                  >
                    {autoGenerateMinutes ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Localization</CardTitle>
                <CardDescription>
                  Language and regional settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Language</Label>
                    <Select value={defaultLanguage} onValueChange={setDefaultLanguage}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sv-SE">Svenska (Swedish)</SelectItem>
                        <SelectItem value="en-US">English (US)</SelectItem>
                        <SelectItem value="en-GB">English (UK)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Europe/Stockholm">Europe/Stockholm</SelectItem>
                        <SelectItem value="Europe/London">Europe/London</SelectItem>
                        <SelectItem value="America/New_York">America/New York</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SEK">SEK (Swedish Krona)</SelectItem>
                        <SelectItem value="EUR">EUR (Euro)</SelectItem>
                        <SelectItem value="USD">USD (US Dollar)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Fiscal Year Start</Label>
                    <Select value={fiscalYearStart} onValueChange={setFiscalYearStart}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">January</SelectItem>
                        <SelectItem value="4">April</SelectItem>
                        <SelectItem value="7">July</SelectItem>
                        <SelectItem value="10">October</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Integrations */}
        <TabsContent value="integrations">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>ERP Integrations</CardTitle>
                <CardDescription>
                  Connect your accounting software for automated financial reporting
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded bg-green-100 flex items-center justify-center">
                      <span className="font-bold text-green-600">F</span>
                    </div>
                    <div>
                      <p className="font-medium">Fortnox</p>
                      <p className="text-sm text-muted-foreground">Swedish accounting platform</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-100 text-green-800 gap-1">
                      <Check className="h-3 w-3" />
                      Connected
                    </Badge>
                    <Button variant="outline" size="sm">Configure</Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded bg-blue-100 flex items-center justify-center">
                      <span className="font-bold text-blue-600">V</span>
                    </div>
                    <div>
                      <p className="font-medium">Visma</p>
                      <p className="text-sm text-muted-foreground">Business management software</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">Connect</Button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded bg-purple-100 flex items-center justify-center">
                      <span className="font-bold text-purple-600">PE</span>
                    </div>
                    <div>
                      <p className="font-medium">PE Accounting</p>
                      <p className="text-sm text-muted-foreground">Cloud accounting solution</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">Connect</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Digital Signatures</CardTitle>
                <CardDescription>
                  Configure electronic signature providers for document signing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded bg-blue-900 flex items-center justify-center">
                      <span className="font-bold text-white text-xs">BankID</span>
                    </div>
                    <div>
                      <p className="font-medium">Swedish BankID</p>
                      <p className="text-sm text-muted-foreground">
                        Qualified electronic signatures for Swedish users
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-100 text-green-800 gap-1">
                      <Check className="h-3 w-3" />
                      Active
                    </Badge>
                    <Button variant="outline" size="sm">Settings</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Calendar Integration</CardTitle>
                <CardDescription>
                  Sync meetings with external calendars
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded bg-blue-100 flex items-center justify-center">
                      <span className="font-bold text-blue-600">O</span>
                    </div>
                    <div>
                      <p className="font-medium">Microsoft 365</p>
                      <p className="text-sm text-muted-foreground">
                        Sync with Outlook calendars
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">Connect</Button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded bg-red-100 flex items-center justify-center">
                      <span className="font-bold text-red-600">G</span>
                    </div>
                    <div>
                      <p className="font-medium">Google Workspace</p>
                      <p className="text-sm text-muted-foreground">
                        Sync with Google Calendar
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">Connect</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Configure how and when members receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium">Meeting Notifications</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Meeting Reminders</p>
                      <p className="text-sm text-muted-foreground">
                        Send reminders before scheduled meetings
                      </p>
                    </div>
                    <Select value={meetingReminderTiming} onValueChange={setMeetingReminderTiming}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="24,2">24h and 2h before</SelectItem>
                        <SelectItem value="48,24">48h and 24h before</SelectItem>
                        <SelectItem value="24">24h before only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Agenda Updates</p>
                      <p className="text-sm text-muted-foreground">
                        Notify when meeting agenda is modified
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAgendaUpdatesEnabled(!agendaUpdatesEnabled)}
                      className={agendaUpdatesEnabled ? 'bg-green-100 text-green-800 hover:bg-green-200' : ''}
                    >
                      {agendaUpdatesEnabled ? 'Enabled' : 'Disabled'}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Minutes Ready</p>
                      <p className="text-sm text-muted-foreground">
                        Notify when meeting minutes are available
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMinutesReadyEnabled(!minutesReadyEnabled)}
                      className={minutesReadyEnabled ? 'bg-green-100 text-green-800 hover:bg-green-200' : ''}
                    >
                      {minutesReadyEnabled ? 'Enabled' : 'Disabled'}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Document Notifications</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">New Documents</p>
                      <p className="text-sm text-muted-foreground">
                        Notify when new documents are uploaded
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setNewDocumentsEnabled(!newDocumentsEnabled)}
                      className={newDocumentsEnabled ? 'bg-green-100 text-green-800 hover:bg-green-200' : ''}
                    >
                      {newDocumentsEnabled ? 'Enabled' : 'Disabled'}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Signature Requests</p>
                      <p className="text-sm text-muted-foreground">
                        Notify when signature is required
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSignatureRequestsEnabled(!signatureRequestsEnabled)}
                      className={signatureRequestsEnabled ? 'bg-green-100 text-green-800 hover:bg-green-200' : ''}
                    >
                      {signatureRequestsEnabled ? 'Enabled' : 'Disabled'}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Action Items</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Task Assignments</p>
                      <p className="text-sm text-muted-foreground">
                        Notify when assigned a new action item
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTaskAssignmentsEnabled(!taskAssignmentsEnabled)}
                      className={taskAssignmentsEnabled ? 'bg-green-100 text-green-800 hover:bg-green-200' : ''}
                    >
                      {taskAssignmentsEnabled ? 'Enabled' : 'Disabled'}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Due Date Reminders</p>
                      <p className="text-sm text-muted-foreground">
                        Remind about upcoming due dates
                      </p>
                    </div>
                    <Select value={dueDateReminderDays} onValueChange={setDueDateReminderDays}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 day before</SelectItem>
                        <SelectItem value="3">3 days before</SelectItem>
                        <SelectItem value="7">1 week before</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {isSaving ? 'Saving...' : 'Save Notification Settings'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance */}
        <TabsContent value="compliance">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Swedish Corporate Governance</CardTitle>
                <CardDescription>
                  Compliance settings for Aktiebolagslagen requirements
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border bg-green-50">
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">Jäv (Conflict of Interest) Detection</p>
                      <p className="text-sm text-muted-foreground">
                        Automatic detection of conflicts in agenda items
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-green-100 text-green-800">Active</Badge>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border bg-green-50">
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">Justerare (Adjuster) Requirement</p>
                      <p className="text-sm text-muted-foreground">
                        Require meeting minutes to be verified by adjuster
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-green-100 text-green-800">Active</Badge>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border bg-green-50">
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">BankID Digital Signatures</p>
                      <p className="text-sm text-muted-foreground">
                        Qualified electronic signatures for official documents
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-green-100 text-green-800">Active</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Data Protection</CardTitle>
                <CardDescription>
                  GDPR and data residency settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <p className="font-medium">Data Residency</p>
                    <p className="text-sm text-muted-foreground">
                      All data stored within the European Union
                    </p>
                  </div>
                  <Badge variant="outline">EU (europe-west1)</Badge>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <p className="font-medium">Document Retention</p>
                    <p className="text-sm text-muted-foreground">
                      Automatic deletion of documents after retention period
                    </p>
                  </div>
                  <Select value={documentRetentionYears} onValueChange={setDocumentRetentionYears}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 years</SelectItem>
                      <SelectItem value="5">5 years</SelectItem>
                      <SelectItem value="7">7 years</SelectItem>
                      <SelectItem value="10">10 years</SelectItem>
                      <SelectItem value="0">Never delete</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <p className="font-medium">Audit Logging</p>
                    <p className="text-sm text-muted-foreground">
                      Track all user actions for compliance
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-green-100 text-green-800">Enabled</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Billing */}
        {isOwner && (
          <TabsContent value="billing">
            <BillingSection
              tenantId={tenantId}
              subscription={currentTenant?.subscription}
              userEmail={user?.email || userProfile?.email}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
