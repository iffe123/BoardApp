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

// Mock data for demonstration - in real app this would come from API/Firestore
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
    status: 'scheduled',
    type: 'board',
  },
  {
    id: '2',
    title: 'Audit Committee',
    scheduledAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    status: 'scheduled',
    type: 'committee',
  },
  {
    id: '3',
    title: 'Annual General Meeting',
    scheduledAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    status: 'scheduled',
    type: 'general',
  },
];

const mockRecentActivity = [
  {
    id: '1',
    type: 'signature',
    message: 'Meeting minutes signed by Johan Lindqvist',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  {
    id: '2',
    type: 'document',
    message: 'Q3 Financial Report uploaded',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
  },
  {
    id: '3',
    type: 'meeting',
    message: 'Board Meeting minutes approved',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
  },
  {
    id: '4',
    type: 'action',
    message: 'Action item completed: Review budget proposal',
    timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000),
  },
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
        <h1 className="text-3xl font-bold">
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
                <p className="text-sm font-medium text-muted-foreground">Upcoming Meetings</p>
                <p className="text-3xl font-bold">{mockStats.upcomingMeetings}</p>
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
                <p className="text-sm font-medium text-muted-foreground">Pending Signatures</p>
                <p className="text-3xl font-bold">{mockStats.pendingSignatures}</p>
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
                <p className="text-sm font-medium text-muted-foreground">Open Action Items</p>
                <p className="text-3xl font-bold">{mockStats.openActionItems}</p>
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
                <p className="text-sm font-medium text-muted-foreground">Documents This Month</p>
                <p className="text-3xl font-bold">{mockStats.documentsThisMonth}</p>
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
              {mockUpcomingMeetings.map((meeting) => (
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
                      <p className="font-medium">{meeting.title}</p>
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
              {mockRecentActivity.map((activity) => (
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
                    <span className="text-sm text-muted-foreground">Revenue (YTD)</span>
                    <div className={`flex items-center text-sm ${mockFinancialSnapshot.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {mockFinancialSnapshot.revenueChange >= 0 ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      )}
                      {Math.abs(mockFinancialSnapshot.revenueChange)}%
                    </div>
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(mockFinancialSnapshot.revenue, 'SEK')}</p>
                </div>

                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Net Income (YTD)</span>
                    <div className={`flex items-center text-sm ${mockFinancialSnapshot.netIncomeChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {mockFinancialSnapshot.netIncomeChange >= 0 ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      )}
                      {Math.abs(mockFinancialSnapshot.netIncomeChange)}%
                    </div>
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(mockFinancialSnapshot.netIncome, 'SEK')}</p>
                </div>

                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Cash Balance</span>
                    <div className={`flex items-center text-sm ${mockFinancialSnapshot.cashChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {mockFinancialSnapshot.cashChange >= 0 ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      )}
                      {Math.abs(mockFinancialSnapshot.cashChange)}%
                    </div>
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(mockFinancialSnapshot.cashBalance, 'SEK')}</p>
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
                    <p className="font-medium">Schedule Meeting</p>
                    <p className="text-xs text-muted-foreground">Create a new board meeting</p>
                  </div>
                </Button>
              </Link>
              <Link href={`/dashboard/${tenantId}/documents`}>
                <Button variant="outline" className="w-full justify-start h-auto py-4">
                  <FileText className="h-5 w-5 mr-3" />
                  <div className="text-left">
                    <p className="font-medium">Upload Document</p>
                    <p className="text-xs text-muted-foreground">Add files to the repository</p>
                  </div>
                </Button>
              </Link>
              <Link href={`/dashboard/${tenantId}/members`}>
                <Button variant="outline" className="w-full justify-start h-auto py-4">
                  <Users className="h-5 w-5 mr-3" />
                  <div className="text-left">
                    <p className="font-medium">Manage Members</p>
                    <p className="text-xs text-muted-foreground">Invite or update members</p>
                  </div>
                </Button>
              </Link>
              <Link href={`/dashboard/${tenantId}/financials`}>
                <Button variant="outline" className="w-full justify-start h-auto py-4">
                  <BarChart3 className="h-5 w-5 mr-3" />
                  <div className="text-left">
                    <p className="font-medium">View Financials</p>
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
