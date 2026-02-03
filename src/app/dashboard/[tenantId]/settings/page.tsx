'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Building2,
  Globe,
  CreditCard,
  Shield,
  Link2,
  Bell,
  Save,
  ExternalLink,
  Check,
} from 'lucide-react';
import { useAuth, usePermissions } from '@/contexts/auth-context';

type TabValue = 'organization' | 'integrations' | 'notifications' | 'compliance' | 'billing';

export default function SettingsPage() {
  const params = useParams();
  void params.tenantId;
  const { currentTenant } = useAuth();
  const { isAdmin, isOwner } = usePermissions();

  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabValue>('organization');

  // Form state
  const [orgName, setOrgName] = useState(currentTenant?.name || '');
  const [orgNumber, setOrgNumber] = useState(currentTenant?.organizationNumber || '');

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-white">
        <div className="rounded-xl bg-white/[0.02] p-12 text-center">
          <Shield className="h-12 w-12 mx-auto text-white/20 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
          <p className="text-white/50">
            You need administrator privileges to access settings.
          </p>
        </div>
      </div>
    );
  }

  const tabs = [
    { value: 'organization' as const, label: 'Organization', icon: Building2 },
    { value: 'integrations' as const, label: 'Integrations', icon: Link2 },
    { value: 'notifications' as const, label: 'Notifications', icon: Bell },
    { value: 'compliance' as const, label: 'Compliance', icon: Shield },
    ...(isOwner ? [{ value: 'billing' as const, label: 'Billing', icon: CreditCard }] : []),
  ];

  return (
    <div className="p-8 text-white">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-white/50 mt-1">
          Manage your organization settings and integrations
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.value
                ? 'bg-white/10 text-white'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Organization Settings */}
      {activeTab === 'organization' && (
        <div className="space-y-6">
          <div className="rounded-xl bg-white/[0.02] p-6">
            <h2 className="text-lg font-semibold mb-1">Organization Details</h2>
            <p className="text-sm text-white/50 mb-6">Basic information about your organization</p>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-white/70">Organization Name</label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Acme AB"
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-white/70">Organization Number</label>
                  <input
                    type="text"
                    value={orgNumber}
                    onChange={(e) => setOrgNumber(e.target.value)}
                    placeholder="556123-4567"
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-white/70">Website</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  <input
                    type="url"
                    placeholder="https://example.com"
                    className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-white/70">Address</label>
                <textarea
                  placeholder="Street Address&#10;City, Postal Code&#10;Country"
                  rows={3}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 resize-none"
                />
              </div>

              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-white text-black font-medium rounded-lg hover:bg-white/90 disabled:opacity-50 transition-colors"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Changes
              </button>
            </div>
          </div>

          <div className="rounded-xl bg-white/[0.02] p-6">
            <h2 className="text-lg font-semibold mb-1">Meeting Defaults</h2>
            <p className="text-sm text-white/50 mb-6">Default settings for new meetings</p>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-white/70">Default Meeting Duration</label>
                  <select className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/20">
                    <option value="60">1 hour</option>
                    <option value="90">1.5 hours</option>
                    <option value="120">2 hours</option>
                    <option value="180">3 hours</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-white/70">Default Quorum</label>
                  <select className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/20">
                    <option value="2">2 members</option>
                    <option value="3">3 members</option>
                    <option value="4">4 members</option>
                    <option value="5">5 members</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                <div>
                  <p className="font-medium">Require Meeting Adjuster</p>
                  <p className="text-sm text-white/40">Swedish compliance requirement (Justerare)</p>
                </div>
                <span className="px-2 py-1 text-xs rounded-md bg-emerald-500/10 text-emerald-400">Enabled</span>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                <div>
                  <p className="font-medium">Auto-generate Meeting Minutes</p>
                  <p className="text-sm text-white/40">Use AI to generate draft minutes after meetings</p>
                </div>
                <span className="px-2 py-1 text-xs rounded-md bg-emerald-500/10 text-emerald-400">Enabled</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white/[0.02] p-6">
            <h2 className="text-lg font-semibold mb-1">Localization</h2>
            <p className="text-sm text-white/50 mb-6">Language and regional settings</p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white/70">Language</label>
                <select className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/20">
                  <option value="sv-SE">Svenska (Swedish)</option>
                  <option value="en-US">English (US)</option>
                  <option value="en-GB">English (UK)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white/70">Timezone</label>
                <select className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/20">
                  <option value="Europe/Stockholm">Europe/Stockholm</option>
                  <option value="Europe/London">Europe/London</option>
                  <option value="America/New_York">America/New York</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white/70">Currency</label>
                <select className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/20">
                  <option value="SEK">SEK (Swedish Krona)</option>
                  <option value="EUR">EUR (Euro)</option>
                  <option value="USD">USD (US Dollar)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white/70">Fiscal Year Start</label>
                <select className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/20">
                  <option value="1">January</option>
                  <option value="4">April</option>
                  <option value="7">July</option>
                  <option value="10">October</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Integrations */}
      {activeTab === 'integrations' && (
        <div className="space-y-6">
          <div className="rounded-xl bg-white/[0.02] p-6">
            <h2 className="text-lg font-semibold mb-1">ERP Integrations</h2>
            <p className="text-sm text-white/50 mb-6">Connect your accounting software for automated financial reporting</p>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded bg-emerald-500/20 flex items-center justify-center">
                    <span className="font-bold text-emerald-400">F</span>
                  </div>
                  <div>
                    <p className="font-medium">Fortnox</p>
                    <p className="text-sm text-white/40">Swedish accounting platform</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-emerald-500/10 text-emerald-400">
                    <Check className="h-3 w-3" />
                    Connected
                  </span>
                  <button className="px-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white/70 hover:bg-white/10 transition-colors">
                    Configure
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded bg-blue-500/20 flex items-center justify-center">
                    <span className="font-bold text-blue-400">V</span>
                  </div>
                  <div>
                    <p className="font-medium">Visma</p>
                    <p className="text-sm text-white/40">Business management software</p>
                  </div>
                </div>
                <button className="px-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white/70 hover:bg-white/10 transition-colors">
                  Connect
                </button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded bg-purple-500/20 flex items-center justify-center">
                    <span className="font-bold text-purple-400">PE</span>
                  </div>
                  <div>
                    <p className="font-medium">PE Accounting</p>
                    <p className="text-sm text-white/40">Cloud accounting solution</p>
                  </div>
                </div>
                <button className="px-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white/70 hover:bg-white/10 transition-colors">
                  Connect
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white/[0.02] p-6">
            <h2 className="text-lg font-semibold mb-1">Digital Signatures</h2>
            <p className="text-sm text-white/50 mb-6">Configure electronic signature providers for document signing</p>

            <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded bg-blue-900/50 flex items-center justify-center">
                  <span className="font-bold text-white text-xs">BankID</span>
                </div>
                <div>
                  <p className="font-medium">Swedish BankID</p>
                  <p className="text-sm text-white/40">Qualified electronic signatures for Swedish users</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-emerald-500/10 text-emerald-400">
                  <Check className="h-3 w-3" />
                  Active
                </span>
                <button className="px-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white/70 hover:bg-white/10 transition-colors">
                  Settings
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white/[0.02] p-6">
            <h2 className="text-lg font-semibold mb-1">Calendar Integration</h2>
            <p className="text-sm text-white/50 mb-6">Sync meetings with external calendars</p>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded bg-blue-500/20 flex items-center justify-center">
                    <span className="font-bold text-blue-400">O</span>
                  </div>
                  <div>
                    <p className="font-medium">Microsoft 365</p>
                    <p className="text-sm text-white/40">Sync with Outlook calendars</p>
                  </div>
                </div>
                <button className="px-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white/70 hover:bg-white/10 transition-colors">
                  Connect
                </button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded bg-red-500/20 flex items-center justify-center">
                    <span className="font-bold text-red-400">G</span>
                  </div>
                  <div>
                    <p className="font-medium">Google Workspace</p>
                    <p className="text-sm text-white/40">Sync with Google Calendar</p>
                  </div>
                </div>
                <button className="px-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white/70 hover:bg-white/10 transition-colors">
                  Connect
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      {activeTab === 'notifications' && (
        <div className="rounded-xl bg-white/[0.02] p-6">
          <h2 className="text-lg font-semibold mb-1">Notification Preferences</h2>
          <p className="text-sm text-white/50 mb-6">Configure how and when members receive notifications</p>

          <div className="space-y-6">
            <div>
              <h4 className="font-medium mb-4">Meeting Notifications</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                  <div>
                    <p className="font-medium">Meeting Reminders</p>
                    <p className="text-sm text-white/40">Send reminders before scheduled meetings</p>
                  </div>
                  <select className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/20">
                    <option value="24,2">24h and 2h before</option>
                    <option value="48,24">48h and 24h before</option>
                    <option value="24">24h before only</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                  <div>
                    <p className="font-medium">Agenda Updates</p>
                    <p className="text-sm text-white/40">Notify when meeting agenda is modified</p>
                  </div>
                  <span className="px-2 py-1 text-xs rounded-md bg-emerald-500/10 text-emerald-400">Enabled</span>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                  <div>
                    <p className="font-medium">Minutes Ready</p>
                    <p className="text-sm text-white/40">Notify when meeting minutes are available</p>
                  </div>
                  <span className="px-2 py-1 text-xs rounded-md bg-emerald-500/10 text-emerald-400">Enabled</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-4">Document Notifications</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                  <div>
                    <p className="font-medium">New Documents</p>
                    <p className="text-sm text-white/40">Notify when new documents are uploaded</p>
                  </div>
                  <span className="px-2 py-1 text-xs rounded-md bg-emerald-500/10 text-emerald-400">Enabled</span>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                  <div>
                    <p className="font-medium">Signature Requests</p>
                    <p className="text-sm text-white/40">Notify when signature is required</p>
                  </div>
                  <span className="px-2 py-1 text-xs rounded-md bg-emerald-500/10 text-emerald-400">Enabled</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-4">Action Items</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                  <div>
                    <p className="font-medium">Task Assignments</p>
                    <p className="text-sm text-white/40">Notify when assigned a new action item</p>
                  </div>
                  <span className="px-2 py-1 text-xs rounded-md bg-emerald-500/10 text-emerald-400">Enabled</span>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                  <div>
                    <p className="font-medium">Due Date Reminders</p>
                    <p className="text-sm text-white/40">Remind about upcoming due dates</p>
                  </div>
                  <select className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/20">
                    <option value="1">1 day before</option>
                    <option value="3">3 days before</option>
                    <option value="7">1 week before</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compliance */}
      {activeTab === 'compliance' && (
        <div className="space-y-6">
          <div className="rounded-xl bg-white/[0.02] p-6">
            <h2 className="text-lg font-semibold mb-1">Swedish Corporate Governance</h2>
            <p className="text-sm text-white/50 mb-6">Compliance settings for Aktiebolagslagen requirements</p>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-emerald-400" />
                  <div>
                    <p className="font-medium">Jäv (Conflict of Interest) Detection</p>
                    <p className="text-sm text-white/40">Automatic detection of conflicts in agenda items</p>
                  </div>
                </div>
                <span className="px-2 py-1 text-xs rounded-md bg-emerald-500/10 text-emerald-400">Active</span>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-emerald-400" />
                  <div>
                    <p className="font-medium">Justerare (Adjuster) Requirement</p>
                    <p className="text-sm text-white/40">Require meeting minutes to be verified by adjuster</p>
                  </div>
                </div>
                <span className="px-2 py-1 text-xs rounded-md bg-emerald-500/10 text-emerald-400">Active</span>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-emerald-400" />
                  <div>
                    <p className="font-medium">BankID Digital Signatures</p>
                    <p className="text-sm text-white/40">Qualified electronic signatures for official documents</p>
                  </div>
                </div>
                <span className="px-2 py-1 text-xs rounded-md bg-emerald-500/10 text-emerald-400">Active</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white/[0.02] p-6">
            <h2 className="text-lg font-semibold mb-1">Data Protection</h2>
            <p className="text-sm text-white/50 mb-6">GDPR and data residency settings</p>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                <div>
                  <p className="font-medium">Data Residency</p>
                  <p className="text-sm text-white/40">All data stored within the European Union</p>
                </div>
                <span className="px-2 py-1 text-xs rounded-md bg-white/10 text-white/70">EU (europe-west1)</span>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                <div>
                  <p className="font-medium">Document Retention</p>
                  <p className="text-sm text-white/40">Automatic deletion of documents after retention period</p>
                </div>
                <select className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/20">
                  <option value="3">3 years</option>
                  <option value="5">5 years</option>
                  <option value="7">7 years</option>
                  <option value="10">10 years</option>
                  <option value="0">Never delete</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                <div>
                  <p className="font-medium">Audit Logging</p>
                  <p className="text-sm text-white/40">Track all user actions for compliance</p>
                </div>
                <span className="px-2 py-1 text-xs rounded-md bg-emerald-500/10 text-emerald-400">Enabled</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Billing */}
      {activeTab === 'billing' && isOwner && (
        <div className="space-y-6">
          <div className="rounded-xl bg-white/[0.02] p-6">
            <h2 className="text-lg font-semibold mb-1">Current Plan</h2>
            <p className="text-sm text-white/50 mb-6">Manage your subscription and billing</p>

            <div className="p-6 rounded-lg bg-white/5 border border-white/20 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <span className="px-2 py-1 text-xs rounded-md bg-white/10 text-white">Professional</span>
                  <p className="text-2xl font-bold mt-2">2,990 SEK/month</p>
                  <p className="text-sm text-white/40">Up to 10 board members · Unlimited meetings</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-white font-medium rounded-lg hover:bg-white/10 transition-colors">
                  Upgrade Plan
                  <ExternalLink className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/40">Next billing date</span>
                <span className="font-medium">March 1, 2024</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/40">Payment method</span>
                <span className="font-medium">Visa ending in 4242</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/40">Billing email</span>
                <span className="font-medium">billing@example.com</span>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button className="px-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white/70 hover:bg-white/10 transition-colors">
                Update Payment Method
              </button>
              <button className="px-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white/70 hover:bg-white/10 transition-colors">
                Download Invoices
              </button>
            </div>
          </div>

          <div className="rounded-xl bg-white/[0.02] p-6">
            <h2 className="text-lg font-semibold mb-1">Usage</h2>
            <p className="text-sm text-white/50 mb-6">Current usage for this billing period</p>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>Board Members</span>
                  <span>6 of 10</span>
                </div>
                <div className="h-2 rounded-full bg-white/10">
                  <div className="h-2 rounded-full bg-white" style={{ width: '60%' }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>Storage</span>
                  <span>2.4 GB of 10 GB</span>
                </div>
                <div className="h-2 rounded-full bg-white/10">
                  <div className="h-2 rounded-full bg-white" style={{ width: '24%' }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>AI Minutes Generated</span>
                  <span>15 of 50</span>
                </div>
                <div className="h-2 rounded-full bg-white/10">
                  <div className="h-2 rounded-full bg-white" style={{ width: '30%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
