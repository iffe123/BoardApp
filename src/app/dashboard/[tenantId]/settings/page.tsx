'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
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
  Unplug,
  Calendar,
  AlertCircle,
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

  // Calendar connections
  const [microsoftStatus, setMicrosoftStatus] = useState<'disconnected' | 'active' | 'error' | 'loading'>('loading');
  const [microsoftEmail, setMicrosoftEmail] = useState<string | null>(null);
  const [microsoftConnecting, setMicrosoftConnecting] = useState(false);
  const [microsoftDisconnecting, setMicrosoftDisconnecting] = useState(false);

  const [googleStatus, setGoogleStatus] = useState<'disconnected' | 'active' | 'error' | 'loading'>('loading');
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [googleConnecting, setGoogleConnecting] = useState(false);
  const [googleDisconnecting, setGoogleDisconnecting] = useState(false);

  const [calendarMessage, setCalendarMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Check URL params for integration success/error messages
  const searchParams = useSearchParams();
  useEffect(() => {
    const success = searchParams.get('success');
    const urlError = searchParams.get('error');
    if (success) {
      setCalendarMessage({ type: 'success', text: success });
      setTimeout(() => setCalendarMessage(null), 5000);
    }
    if (urlError) {
      setCalendarMessage({ type: 'error', text: urlError });
      setTimeout(() => setCalendarMessage(null), 8000);
    }
  }, [searchParams]);

  // Fetch calendar connection status
  const fetchCalendarStatus = useCallback(async () => {
    if (!tenantId) return;

    try {
      const response = await fetch(`/api/integrations/calendar/status?tenantId=${tenantId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.microsoft) {
          setMicrosoftStatus(data.microsoft.status === 'active' ? 'active' : 'disconnected');
          setMicrosoftEmail(data.microsoft.accountEmail || null);
        } else {
          setMicrosoftStatus('disconnected');
        }
        if (data.google) {
          setGoogleStatus(data.google.status === 'active' ? 'active' : 'disconnected');
          setGoogleEmail(data.google.accountEmail || null);
        } else {
          setGoogleStatus('disconnected');
        }
      } else {
        setMicrosoftStatus('disconnected');
        setGoogleStatus('disconnected');
      }
    } catch {
      setMicrosoftStatus('disconnected');
      setGoogleStatus('disconnected');
    }
  }, [tenantId]);

  useEffect(() => {
    fetchCalendarStatus();
  }, [fetchCalendarStatus]);

  // Microsoft 365 connect handler
  const handleMicrosoftConnect = async () => {
    setMicrosoftConnecting(true);
    setCalendarMessage(null);
    try {
      const response = await fetch('/api/integrations/microsoft/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          userId: user?.uid,
          userName: userProfile?.displayName || user?.displayName || 'Unknown',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect Microsoft 365');
      }

      if (data.authUrl) {
        // Redirect to Microsoft OAuth
        window.location.href = data.authUrl;
        return;
      }

      // Mock mode - connection established directly
      setMicrosoftStatus('active');
      setMicrosoftEmail(data.isMock ? 'board@example.com (mock)' : null);
      setCalendarMessage({ type: 'success', text: 'Microsoft 365 connected successfully' });
      setTimeout(() => setCalendarMessage(null), 5000);
    } catch (err) {
      setCalendarMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to connect Microsoft 365',
      });
    } finally {
      setMicrosoftConnecting(false);
    }
  };

  // Microsoft 365 disconnect handler
  const handleMicrosoftDisconnect = async () => {
    setMicrosoftDisconnecting(true);
    setCalendarMessage(null);
    try {
      const response = await fetch('/api/integrations/microsoft/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          userId: user?.uid,
          userName: userProfile?.displayName || user?.displayName || 'Unknown',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to disconnect Microsoft 365');
      }

      setMicrosoftStatus('disconnected');
      setMicrosoftEmail(null);
      setCalendarMessage({ type: 'success', text: 'Microsoft 365 disconnected' });
      setTimeout(() => setCalendarMessage(null), 5000);
    } catch (err) {
      setCalendarMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to disconnect Microsoft 365',
      });
    } finally {
      setMicrosoftDisconnecting(false);
    }
  };

  // Google Workspace connect handler
  const handleGoogleConnect = async () => {
    setGoogleConnecting(true);
    setCalendarMessage(null);
    try {
      const response = await fetch('/api/integrations/google/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          userId: user?.uid,
          userName: userProfile?.displayName || user?.displayName || 'Unknown',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect Google Workspace');
      }

      if (data.authUrl) {
        // Redirect to Google OAuth
        window.location.href = data.authUrl;
        return;
      }

      // Mock mode - connection established directly
      setGoogleStatus('active');
      setGoogleEmail(data.isMock ? 'board@example.com (mock)' : null);
      setCalendarMessage({ type: 'success', text: 'Google Workspace connected successfully' });
      setTimeout(() => setCalendarMessage(null), 5000);
    } catch (err) {
      setCalendarMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to connect Google Workspace',
      });
    } finally {
      setGoogleConnecting(false);
    }
  };

  // Google Workspace disconnect handler
  const handleGoogleDisconnect = async () => {
    setGoogleDisconnecting(true);
    setCalendarMessage(null);
    try {
      const response = await fetch('/api/integrations/google/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          userId: user?.uid,
          userName: userProfile?.displayName || user?.displayName || 'Unknown',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to disconnect Google Workspace');
      }

      setGoogleStatus('disconnected');
      setGoogleEmail(null);
      setCalendarMessage({ type: 'success', text: 'Google Workspace disconnected' });
      setTimeout(() => setCalendarMessage(null), 5000);
    } catch (err) {
      setCalendarMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to disconnect Google Workspace',
      });
    } finally {
      setGoogleDisconnecting(false);
    }
  };

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
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
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
                  Sync meetings with external calendars. New meetings will automatically appear in the connected calendar.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {calendarMessage && (
                  <div className={`p-3 rounded-md text-sm flex items-center gap-2 ${
                    calendarMessage.type === 'success'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-destructive/10 text-destructive'
                  }`}>
                    {calendarMessage.type === 'success' ? (
                      <Check className="h-4 w-4 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    )}
                    {calendarMessage.text}
                  </div>
                )}

                {/* Microsoft 365 / Outlook */}
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded bg-blue-100 flex items-center justify-center">
                      <span className="font-bold text-blue-600">O</span>
                    </div>
                    <div>
                      <p className="font-medium">Microsoft 365</p>
                      <p className="text-sm text-muted-foreground">
                        {microsoftStatus === 'active' && microsoftEmail
                          ? `Connected as ${microsoftEmail}`
                          : 'Sync with Outlook calendars'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {microsoftStatus === 'active' ? (
                      <>
                        <Badge variant="outline" className="bg-green-100 text-green-800 gap-1">
                          <Check className="h-3 w-3" />
                          Connected
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleMicrosoftDisconnect}
                          disabled={microsoftDisconnecting}
                        >
                          {microsoftDisconnecting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Unplug className="h-4 w-4" />
                          )}
                          <span className="ml-1">Disconnect</span>
                        </Button>
                      </>
                    ) : microsoftStatus === 'loading' ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleMicrosoftConnect}
                        disabled={microsoftConnecting}
                      >
                        {microsoftConnecting ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Calendar className="h-4 w-4 mr-1" />
                        )}
                        Connect
                      </Button>
                    )}
                  </div>
                </div>

                {/* Google Workspace */}
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded bg-red-100 flex items-center justify-center">
                      <span className="font-bold text-red-600">G</span>
                    </div>
                    <div>
                      <p className="font-medium">Google Workspace</p>
                      <p className="text-sm text-muted-foreground">
                        {googleStatus === 'active' && googleEmail
                          ? `Connected as ${googleEmail}`
                          : 'Sync with Google Calendar'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {googleStatus === 'active' ? (
                      <>
                        <Badge variant="outline" className="bg-green-100 text-green-800 gap-1">
                          <Check className="h-3 w-3" />
                          Connected
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleGoogleDisconnect}
                          disabled={googleDisconnecting}
                        >
                          {googleDisconnecting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Unplug className="h-4 w-4" />
                          )}
                          <span className="ml-1">Disconnect</span>
                        </Button>
                      </>
                    ) : googleStatus === 'loading' ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGoogleConnect}
                        disabled={googleConnecting}
                      >
                        {googleConnecting ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Calendar className="h-4 w-4 mr-1" />
                        )}
                        Connect
                      </Button>
                    )}
                  </div>
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
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Current Plan</CardTitle>
                  <CardDescription>
                    Manage your subscription and billing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-6 rounded-lg border-2 border-primary bg-primary/5">
                    <div>
                      <Badge className="mb-2">Professional</Badge>
                      <p className="text-2xl font-bold">2,990 SEK/month</p>
                      <p className="text-sm text-muted-foreground">
                        Up to 10 board members · Unlimited meetings
                      </p>
                    </div>
                    <Button variant="outline">
                      Upgrade Plan
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </Button>
                  </div>

                  <div className="mt-6 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Next billing date</span>
                      <span className="font-medium">March 1, 2024</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Payment method</span>
                      <span className="font-medium">Visa ending in 4242</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Billing email</span>
                      <span className="font-medium">billing@example.com</span>
                    </div>
                  </div>

                  <div className="mt-6 flex gap-2">
                    <Button variant="outline" size="sm">Update Payment Method</Button>
                    <Button variant="outline" size="sm">Download Invoices</Button>
                  </div>
                </CardContent>
              </Card>

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
                        <span>6 of 10</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted">
                        <div className="h-2 rounded-full bg-primary" style={{ width: '60%' }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span>Storage</span>
                        <span>2.4 GB of 10 GB</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted">
                        <div className="h-2 rounded-full bg-primary" style={{ width: '24%' }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span>AI Minutes Generated</span>
                        <span>15 of 50</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted">
                        <div className="h-2 rounded-full bg-primary" style={{ width: '30%' }} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
