'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Calendar,
  FileText,
  BarChart3,
  Users,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Plus,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { useAuth, usePermissions } from '@/contexts/auth-context';
import { formatRelativeDate, formatCurrency } from '@/lib/utils';

// Mock data for demonstration
const mockStats = {
  upcomingMeetings: 3,
  pendingSignatures: 5,
  openActionItems: 12,
  documentsThisMonth: 8,
};

const mockUpcomingMeetings = [
  {
    id: '1',
    title: 'Q4 Board Meeting',
    scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    type: 'board',
  },
  {
    id: '2',
    title: 'Audit Committee',
    scheduledAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    type: 'committee',
  },
  {
    id: '3',
    title: 'Annual General Meeting',
    scheduledAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    type: 'general',
  },
];

const mockRecentActivity = [
  { id: '1', type: 'signature', message: 'Meeting minutes signed by Johan Lindqvist', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) },
  { id: '2', type: 'document', message: 'Q3 Financial Report uploaded', timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000) },
  { id: '3', type: 'meeting', message: 'Board Meeting minutes approved', timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  { id: '4', type: 'action', message: 'Action item completed: Review budget proposal', timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000) },
];

const mockFinancialSnapshot = {
  revenue: 12500000,
  revenueChange: 8.5,
  netIncome: 1850000,
  netIncomeChange: -2.3,
  cashBalance: 4200000,
  cashChange: 15.2,
};

export default function DashboardPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const { currentTenant, userProfile } = useAuth();
  const { canViewFinancials } = usePermissions();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getMeetingTypeStyle = (type: string) => {
    const styles: Record<string, string> = {
      board: 'bg-blue-500/10 text-blue-400',
      committee: 'bg-purple-500/10 text-purple-400',
      general: 'bg-emerald-500/10 text-emerald-400',
    };
    return styles[type] || 'bg-white/10 text-white/60';
  };

  return (
    <div className="p-8 text-white">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">
          {getGreeting()}, {userProfile?.displayName?.split(' ')[0] || 'there'}
        </h1>
        <p className="text-white/50 mt-1">
          Here&apos;s what&apos;s happening at {currentTenant?.name || 'your organization'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-10">
        <div className="p-6 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/40">Upcoming Meetings</p>
              <p className="text-3xl font-bold mt-1">{mockStats.upcomingMeetings}</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-500/10">
              <Calendar className="h-5 w-5 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="p-6 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/40">Pending Signatures</p>
              <p className="text-3xl font-bold mt-1">{mockStats.pendingSignatures}</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10">
              <FileText className="h-5 w-5 text-amber-400" />
            </div>
          </div>
        </div>

        <div className="p-6 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/40">Open Action Items</p>
              <p className="text-3xl font-bold mt-1">{mockStats.openActionItems}</p>
            </div>
            <div className="p-3 rounded-xl bg-red-500/10">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
          </div>
        </div>

        <div className="p-6 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/40">Documents This Month</p>
              <p className="text-3xl font-bold mt-1">{mockStats.documentsThisMonth}</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Meetings */}
        <div className="rounded-xl bg-white/[0.02] p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold">Upcoming Meetings</h2>
              <p className="text-sm text-white/40">Your scheduled board and committee meetings</p>
            </div>
            <Link
              href={`/dashboard/${tenantId}/meetings/new`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white text-black font-medium rounded-lg hover:bg-white/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              New
            </Link>
          </div>
          <div className="space-y-2">
            {mockUpcomingMeetings.map((meeting) => (
              <Link
                key={meeting.id}
                href={`/dashboard/${tenantId}/meetings/${meeting.id}`}
                className="flex items-center justify-between p-4 rounded-lg hover:bg-white/5 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white/5">
                    <Calendar className="h-4 w-4 text-white/60" />
                  </div>
                  <div>
                    <p className="font-medium">{meeting.title}</p>
                    <p className="text-sm text-white/40">{formatRelativeDate(meeting.scheduledAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 text-xs rounded-md ${getMeetingTypeStyle(meeting.type)}`}>
                    {meeting.type}
                  </span>
                  <ArrowRight className="h-4 w-4 text-white/20 group-hover:text-white/60 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
          <Link
            href={`/dashboard/${tenantId}/meetings`}
            className="flex items-center justify-center gap-2 w-full mt-4 py-2 text-sm text-white/50 hover:text-white transition-colors"
          >
            View all meetings
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Recent Activity */}
        <div className="rounded-xl bg-white/[0.02] p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold">Recent Activity</h2>
            <p className="text-sm text-white/40">Latest updates from your organization</p>
          </div>
          <div className="space-y-4">
            {mockRecentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-white/5 mt-0.5">
                  {activity.type === 'signature' && <FileText className="h-3 w-3 text-white/40" />}
                  {activity.type === 'document' && <FileText className="h-3 w-3 text-white/40" />}
                  {activity.type === 'meeting' && <Calendar className="h-3 w-3 text-white/40" />}
                  {activity.type === 'action' && <CheckCircle className="h-3 w-3 text-white/40" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{activity.message}</p>
                  <p className="text-xs text-white/30 mt-0.5">{formatRelativeDate(activity.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Financial Snapshot */}
        {canViewFinancials && (
          <div className="rounded-xl bg-white/[0.02] p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold">Financial Snapshot</h2>
                <p className="text-sm text-white/40">Key financial metrics at a glance</p>
              </div>
              <Link
                href={`/dashboard/${tenantId}/financials`}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-white/60 hover:text-white transition-colors"
              >
                View Details
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-5 rounded-xl bg-white/[0.02]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white/40">Revenue (YTD)</span>
                  <span className={`flex items-center text-sm ${mockFinancialSnapshot.revenueChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {mockFinancialSnapshot.revenueChange >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                    {Math.abs(mockFinancialSnapshot.revenueChange)}%
                  </span>
                </div>
                <p className="text-2xl font-bold">{formatCurrency(mockFinancialSnapshot.revenue, 'SEK')}</p>
              </div>

              <div className="p-5 rounded-xl bg-white/[0.02]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white/40">Net Income (YTD)</span>
                  <span className={`flex items-center text-sm ${mockFinancialSnapshot.netIncomeChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {mockFinancialSnapshot.netIncomeChange >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                    {Math.abs(mockFinancialSnapshot.netIncomeChange)}%
                  </span>
                </div>
                <p className="text-2xl font-bold">{formatCurrency(mockFinancialSnapshot.netIncome, 'SEK')}</p>
              </div>

              <div className="p-5 rounded-xl bg-white/[0.02]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white/40">Cash Balance</span>
                  <span className={`flex items-center text-sm ${mockFinancialSnapshot.cashChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {mockFinancialSnapshot.cashChange >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                    {Math.abs(mockFinancialSnapshot.cashChange)}%
                  </span>
                </div>
                <p className="text-2xl font-bold">{formatCurrency(mockFinancialSnapshot.cashBalance, 'SEK')}</p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className={`rounded-xl bg-white/[0.02] p-6 ${canViewFinancials ? '' : 'lg:col-span-2'}`}>
          <div className="mb-6">
            <h2 className="text-lg font-semibold">Quick Actions</h2>
            <p className="text-sm text-white/40">Common tasks and shortcuts</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href={`/dashboard/${tenantId}/meetings/new`}
              className="flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 transition-colors group"
            >
              <div className="p-2 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
                <Calendar className="h-5 w-5 text-white/60" />
              </div>
              <div>
                <p className="font-medium">Schedule Meeting</p>
                <p className="text-xs text-white/40">Create a new board meeting</p>
              </div>
            </Link>
            <Link
              href={`/dashboard/${tenantId}/documents`}
              className="flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 transition-colors group"
            >
              <div className="p-2 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
                <FileText className="h-5 w-5 text-white/60" />
              </div>
              <div>
                <p className="font-medium">Upload Document</p>
                <p className="text-xs text-white/40">Add files to the repository</p>
              </div>
            </Link>
            <Link
              href={`/dashboard/${tenantId}/members`}
              className="flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 transition-colors group"
            >
              <div className="p-2 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
                <Users className="h-5 w-5 text-white/60" />
              </div>
              <div>
                <p className="font-medium">Manage Members</p>
                <p className="text-xs text-white/40">Invite or update members</p>
              </div>
            </Link>
            <Link
              href={`/dashboard/${tenantId}/financials`}
              className="flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 transition-colors group"
            >
              <div className="p-2 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
                <BarChart3 className="h-5 w-5 text-white/60" />
              </div>
              <div>
                <p className="font-medium">View Financials</p>
                <p className="text-xs text-white/40">Check latest reports</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
