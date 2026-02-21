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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth, usePermissions } from '@/contexts/auth-context';
import { formatRelativeDate, formatCurrency } from '@/lib/utils';
import { useMeetings, useDocuments, useDecisions } from '@/hooks/use-firestore';
import { isDemoTenant, demoFinancials } from '@/lib/demo-data';

const emptyFinancialSnapshot = {
  revenue: 0,
  revenueChange: 0,
  netIncome: 0,
  netIncomeChange: 0,
  cashBalance: 0,
  cashChange: 0,
};

export default function DashboardPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const { currentTenant, userProfile } = useAuth();
  const { canViewFinancials } = usePermissions();

  const isDemo = isDemoTenant(tenantId);

  // Fetch real data from hooks
  const { data: meetings = [] } = useMeetings(tenantId);
  const { data: documents = [] } = useDocuments(tenantId);
  const { data: decisions = [] } = useDecisions(tenantId);

  // Compute stats from real data
  const now = new Date();
  const upcomingMeetings = meetings.filter((m) => {
    const start = m.scheduledStart?.toDate ? m.scheduledStart.toDate() : new Date(0);
    return start > now && (m.status === 'scheduled' || m.status === 'draft');
  });

  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const documentsThisMonth = documents.filter((d) => {
    const created = d.createdAt?.toDate ? d.createdAt.toDate() : new Date(0);
    return created.getMonth() === thisMonth && created.getFullYear() === thisYear;
  });

  // Count open action items from all meetings
  const openActionItems = meetings.reduce((count, m) => {
    return count + m.agendaItems.reduce((ac, item) => {
      return ac + item.actionItems.filter((a) => a.status === 'pending' || a.status === 'in_progress').length;
    }, 0);
  }, 0);

  const stats = {
    upcomingMeetings: upcomingMeetings.length,
    pendingSignatures: isDemo ? 2 : 0,
    openActionItems,
    documentsThisMonth: documentsThisMonth.length,
  };

  // Build upcoming meetings list for display
  const meetingTypeMap: Record<string, string> = {
    ordinary: 'board',
    extraordinary: 'committee',
    annual_general: 'general',
    statutory: 'board',
  };
  const upcomingMeetingsList = upcomingMeetings.slice(0, 3).map((m) => ({
    id: m.id,
    title: m.title,
    scheduledAt: m.scheduledStart?.toDate ? m.scheduledStart.toDate() : new Date(),
    status: m.status,
    type: meetingTypeMap[m.meetingType] || 'board',
  }));

  // Build recent activity from real data
  const recentActivity: Array<{ id: string; type: string; message: string; timestamp: Date }> = [];

  // Add recent meetings as activity
  meetings
    .filter((m) => m.status === 'completed')
    .slice(0, 2)
    .forEach((m) => {
      recentActivity.push({
        id: `meeting-${m.id}`,
        type: 'meeting',
        message: `${m.title} completed`,
        timestamp: m.updatedAt?.toDate ? m.updatedAt.toDate() : new Date(),
      });
    });

  // Add recent documents as activity
  documents.slice(0, 2).forEach((d) => {
    recentActivity.push({
      id: `doc-${d.id}`,
      type: 'document',
      message: `${d.name} uploaded`,
      timestamp: d.createdAt?.toDate ? d.createdAt.toDate() : new Date(),
    });
  });

  // Add recent decisions as activity
  decisions.slice(0, 2).forEach((d) => {
    recentActivity.push({
      id: `decision-${d.id}`,
      type: 'action',
      message: `Decision: ${d.title} – ${d.outcome}`,
      timestamp: d.decidedAt?.toDate ? d.decidedAt.toDate() : new Date(),
    });
  });

  // Sort by timestamp descending
  recentActivity.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  // Financial snapshot
  let financialSnapshot = emptyFinancialSnapshot;
  if (isDemo && demoFinancials.length >= 2) {
    const latest = demoFinancials[0]!;
    const prev = demoFinancials[1]!;
    const rev = latest.incomeStatement.revenue;
    const prevRev = prev.incomeStatement.revenue;
    const net = latest.incomeStatement.netIncome;
    const prevNet = prev.incomeStatement.netIncome;
    const cash = latest.balanceSheet.cashAndEquivalents;
    const prevCash = prev.balanceSheet.cashAndEquivalents;
    financialSnapshot = {
      revenue: rev,
      revenueChange: prevRev ? ((rev - prevRev) / prevRev) * 100 : 0,
      netIncome: net,
      netIncomeChange: prevNet ? ((net - prevNet) / prevNet) * 100 : 0,
      cashBalance: cash,
      cashChange: prevCash ? ((cash - prevCash) / prevCash) * 100 : 0,
    };
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getMeetingTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      board: 'bg-blue-100 text-blue-800',
      committee: 'bg-purple-100 text-purple-800',
      general: 'bg-green-100 text-green-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-light tracking-tight">
          {getGreeting()}, {userProfile?.displayName?.split(' ')[0] || 'there'}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s what&apos;s happening at {currentTenant?.name || 'your organization'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-normal text-muted-foreground">Upcoming Meetings</p>
                <p className="text-3xl font-light">{stats.upcomingMeetings}</p>
              </div>
              <div className="rounded-full bg-blue-100 p-3">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-normal text-muted-foreground">Pending Signatures</p>
                <p className="text-3xl font-light">{stats.pendingSignatures}</p>
              </div>
              <div className="rounded-full bg-amber-100 p-3">
                <FileText className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-normal text-muted-foreground">Open Action Items</p>
                <p className="text-3xl font-light">{stats.openActionItems}</p>
              </div>
              <div className="rounded-full bg-red-100 p-3">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-normal text-muted-foreground">Documents This Month</p>
                <p className="text-3xl font-light">{stats.documentsThisMonth}</p>
              </div>
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Meetings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Upcoming Meetings</CardTitle>
              <CardDescription>Your scheduled board and committee meetings</CardDescription>
            </div>
            <Link href={`/dashboard/${tenantId}/meetings/new`}>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingMeetingsList.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">No upcoming meetings</p>
              )}
              {upcomingMeetingsList.map((meeting) => (
                <Link
                  key={meeting.id}
                  href={`/dashboard/${tenantId}/meetings/${meeting.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-primary/10 p-2">
                      <Calendar className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-normal">{meeting.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatRelativeDate(meeting.scheduledAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={getMeetingTypeBadge(meeting.type)}>
                      {meeting.type}
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
            <Link href={`/dashboard/${tenantId}/meetings`}>
              <Button variant="ghost" className="w-full mt-4">
                View all meetings
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates from your organization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">No recent activity</p>
              )}
              {recentActivity.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="rounded-full bg-muted p-2 mt-0.5">
                    {activity.type === 'signature' && <FileText className="h-3 w-3" />}
                    {activity.type === 'document' && <FileText className="h-3 w-3" />}
                    {activity.type === 'meeting' && <Calendar className="h-3 w-3" />}
                    {activity.type === 'action' && <CheckCircle className="h-3 w-3" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">{activity.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeDate(activity.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Financial Snapshot - Only visible to authorized roles */}
        {canViewFinancials && (
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Financial Snapshot</CardTitle>
                <CardDescription>Key financial metrics at a glance</CardDescription>
              </div>
              <Link href={`/dashboard/${tenantId}/financials`}>
                <Button variant="outline" size="sm">
                  View Details
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Revenue (Latest)</span>
                    <div className={`flex items-center text-sm ${financialSnapshot.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {financialSnapshot.revenueChange >= 0 ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      )}
                      {Math.abs(financialSnapshot.revenueChange).toFixed(1)}%
                    </div>
                  </div>
                  <p className="text-2xl font-light">{formatCurrency(financialSnapshot.revenue, 'SEK')}</p>
                </div>

                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Net Income (Latest)</span>
                    <div className={`flex items-center text-sm ${financialSnapshot.netIncomeChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {financialSnapshot.netIncomeChange >= 0 ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      )}
                      {Math.abs(financialSnapshot.netIncomeChange).toFixed(1)}%
                    </div>
                  </div>
                  <p className="text-2xl font-light">{formatCurrency(financialSnapshot.netIncome, 'SEK')}</p>
                </div>

                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Cash Balance</span>
                    <div className={`flex items-center text-sm ${financialSnapshot.cashChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {financialSnapshot.cashChange >= 0 ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      )}
                      {Math.abs(financialSnapshot.cashChange).toFixed(1)}%
                    </div>
                  </div>
                  <p className="text-2xl font-light">{formatCurrency(financialSnapshot.cashBalance, 'SEK')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card className={canViewFinancials ? '' : 'lg:col-span-2'}>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <Link href={`/dashboard/${tenantId}/meetings/new`}>
                <Button variant="outline" className="w-full justify-start h-auto py-4">
                  <Calendar className="h-5 w-5 mr-3" />
                  <div className="text-left">
                    <p className="font-normal">Schedule Meeting</p>
                    <p className="text-xs text-muted-foreground">Create a new board meeting</p>
                  </div>
                </Button>
              </Link>
              <Link href={`/dashboard/${tenantId}/documents`}>
                <Button variant="outline" className="w-full justify-start h-auto py-4">
                  <FileText className="h-5 w-5 mr-3" />
                  <div className="text-left">
                    <p className="font-normal">Upload Document</p>
                    <p className="text-xs text-muted-foreground">Add files to the repository</p>
                  </div>
                </Button>
              </Link>
              <Link href={`/dashboard/${tenantId}/members`}>
                <Button variant="outline" className="w-full justify-start h-auto py-4">
                  <Users className="h-5 w-5 mr-3" />
                  <div className="text-left">
                    <p className="font-normal">Manage Members</p>
                    <p className="text-xs text-muted-foreground">Invite or update members</p>
                  </div>
                </Button>
              </Link>
              <Link href={`/dashboard/${tenantId}/financials`}>
                <Button variant="outline" className="w-full justify-start h-auto py-4">
                  <BarChart3 className="h-5 w-5 mr-3" />
                  <div className="text-left">
                    <p className="font-normal">View Financials</p>
                    <p className="text-xs text-muted-foreground">Check latest reports</p>
                  </div>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
