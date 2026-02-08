'use client';

/**
 * Client Manager Overview Component
 *
 * For accounting firms and professional board workers who manage
 * multiple organizations. Provides a bird's-eye view across all clients.
 */

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import {
  Building2,
  Users,
  Calendar,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Search,
  Filter,
  LayoutGrid,
  List,
  Plus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { Tenant, MemberRole } from '@/types/schema';

// ============================================================================
// TYPES
// ============================================================================

interface ClientData {
  tenant: Tenant;
  role: MemberRole;
  stats: {
    upcomingMeetings: number;
    pendingSignatures: number;
    documentsThisMonth: number;
    lastMeetingDate?: Date;
  };
  alerts: Array<{
    type: 'warning' | 'info' | 'error';
    message: string;
  }>;
  financialSummary?: {
    revenue: number;
    revenueChange: number;
    netIncome: number;
    netIncomeChange: number;
  };
}

interface ClientOverviewProps {
  clients: ClientData[];
  onSelectClient: (tenantId: string) => void;
}

// ============================================================================
// CLIENT CARD COMPONENT
// ============================================================================

interface ClientCardProps {
  client: ClientData;
  onSelect: () => void;
  viewMode: 'grid' | 'list';
}

function ClientCard({ client, onSelect, viewMode }: ClientCardProps) {
  const hasAlerts = client.alerts.length > 0;
  const hasWarning = client.alerts.some((a) => a.type === 'warning' || a.type === 'error');

  if (viewMode === 'list') {
    return (
      <div
        className={cn(
          'flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors',
          hasWarning && 'border-amber-300 bg-amber-50/50'
        )}
        onClick={onSelect}
      >
        {/* Logo */}
        <div className="shrink-0">
          {client.tenant.logoUrl ? (
            <Image
              src={client.tenant.logoUrl}
              alt={client.tenant.name}
              width={48}
              height={48}
              className="h-12 w-12 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-6 w-6" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold truncate">{client.tenant.name}</h3>
            {hasWarning && <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />}
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {client.tenant.organizationNumber || 'No org number'}
            {client.tenant.industry && ` · ${client.tenant.industry}`}
          </p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 shrink-0">
          <div className="text-center">
            <p className="text-lg font-semibold">{client.stats.upcomingMeetings}</p>
            <p className="text-xs text-muted-foreground">Meetings</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold">{client.stats.pendingSignatures}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
          {client.financialSummary && (
            <div className="text-center">
              <p className={cn(
                'text-lg font-semibold',
                client.financialSummary.netIncomeChange >= 0 ? 'text-green-600' : 'text-red-600'
              )}>
                {client.financialSummary.netIncomeChange >= 0 ? '+' : ''}
                {client.financialSummary.netIncomeChange.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">NI Change</p>
            </div>
          )}
        </div>

        {/* Role Badge */}
        <Badge variant="outline" className="shrink-0 capitalize">
          {client.role}
        </Badge>

        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
      </div>
    );
  }

  // Grid view
  return (
    <Card
      className={cn(
        'cursor-pointer hover:shadow-md transition-shadow',
        hasWarning && 'border-amber-300'
      )}
      onClick={onSelect}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {client.tenant.logoUrl ? (
              <Image
                src={client.tenant.logoUrl}
                alt={client.tenant.name}
                width={40}
                height={40}
                className="h-10 w-10 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Building2 className="h-5 w-5" />
              </div>
            )}
            <div>
              <CardTitle className="text-base">{client.tenant.name}</CardTitle>
              <CardDescription className="text-xs">
                {client.tenant.organizationNumber || 'No org number'}
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="capitalize text-xs">
            {client.role}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-md bg-muted p-2">
            <Calendar className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-lg font-semibold">{client.stats.upcomingMeetings}</p>
            <p className="text-[10px] text-muted-foreground">Meetings</p>
          </div>
          <div className="rounded-md bg-muted p-2">
            <FileText className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-lg font-semibold">{client.stats.pendingSignatures}</p>
            <p className="text-[10px] text-muted-foreground">To Sign</p>
          </div>
          <div className="rounded-md bg-muted p-2">
            <Users className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-lg font-semibold">{client.stats.documentsThisMonth}</p>
            <p className="text-[10px] text-muted-foreground">Docs</p>
          </div>
        </div>

        {/* Financial Summary */}
        {client.financialSummary && (
          <div className="border-t pt-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Revenue</span>
              <div className="flex items-center gap-1">
                <span className="font-medium">
                  {formatCurrency(client.financialSummary.revenue, 'SEK', 'sv-SE')}
                </span>
                {client.financialSummary.revenueChange >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600" />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Alerts */}
        {hasAlerts && (
          <div className="space-y-1">
            {client.alerts.slice(0, 2).map((alert, idx) => (
              <div
                key={idx}
                className={cn(
                  'flex items-center gap-2 text-xs rounded px-2 py-1',
                  alert.type === 'warning' && 'bg-amber-50 text-amber-800',
                  alert.type === 'error' && 'bg-red-50 text-red-800',
                  alert.type === 'info' && 'bg-blue-50 text-blue-800'
                )}
              >
                <AlertCircle className="h-3 w-3 shrink-0" />
                <span className="truncate">{alert.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* Last Activity */}
        {client.stats.lastMeetingDate && (
          <p className="text-xs text-muted-foreground">
            Last meeting: {formatDate(client.stats.lastMeetingDate)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// SUMMARY STATS
// ============================================================================

interface SummaryStatsProps {
  clients: ClientData[];
}

function SummaryStats({ clients }: SummaryStatsProps) {
  const totalMeetings = clients.reduce((sum, c) => sum + c.stats.upcomingMeetings, 0);
  const totalPending = clients.reduce((sum, c) => sum + c.stats.pendingSignatures, 0);
  const clientsWithAlerts = clients.filter((c) =>
    c.alerts.some((a) => a.type === 'warning' || a.type === 'error')
  ).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2 text-blue-600">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{clients.length}</p>
              <p className="text-sm text-muted-foreground">Organizations</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-2 text-green-600">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalMeetings}</p>
              <p className="text-sm text-muted-foreground">Upcoming Meetings</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2 text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalPending}</p>
              <p className="text-sm text-muted-foreground">Pending Signatures</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              'rounded-lg p-2',
              clientsWithAlerts > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
            )}>
              {clientsWithAlerts > 0 ? (
                <AlertCircle className="h-5 w-5" />
              ) : (
                <CheckCircle className="h-5 w-5" />
              )}
            </div>
            <div>
              <p className="text-2xl font-bold">{clientsWithAlerts}</p>
              <p className="text-sm text-muted-foreground">Needs Attention</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ClientOverview({ clients, onSelectClient }: ClientOverviewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'meetings' | 'alerts'>('name');

  // Filter and sort clients
  const filteredClients = useMemo(() => {
    const result = clients.filter(
      (c) =>
        c.tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.tenant.organizationNumber?.includes(searchQuery)
    );

    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.tenant.name.localeCompare(b.tenant.name);
        case 'meetings':
          return b.stats.upcomingMeetings - a.stats.upcomingMeetings;
        case 'alerts':
          return b.alerts.length - a.alerts.length;
        default:
          return 0;
      }
    });

    return result;
  }, [clients, searchQuery, sortBy]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Client Manager</h1>
          <p className="text-muted-foreground">
            Manage all your organizations from one place
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Organization
        </Button>
      </div>

      {/* Summary Stats */}
      <SummaryStats clients={clients} />

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search organizations..."
            className="pl-10"
          />
        </div>

        <Select value={sortBy} onValueChange={(v: 'name' | 'meetings' | 'alerts') => setSortBy(v)}>
          <SelectTrigger className="w-40">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="meetings">Upcoming Meetings</SelectItem>
            <SelectItem value="alerts">Needs Attention</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center border rounded-md">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            className="rounded-r-none"
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            className="rounded-l-none"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Client List */}
      {filteredClients.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No organizations found</h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery
                ? 'Try a different search term'
                : 'Add organizations to start managing them'}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => (
            <ClientCard
              key={client.tenant.id}
              client={client}
              onSelect={() => onSelectClient(client.tenant.id)}
              viewMode="grid"
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0 divide-y">
            {filteredClients.map((client) => (
              <ClientCard
                key={client.tenant.id}
                client={client}
                onSelect={() => onSelectClient(client.tenant.id)}
                viewMode="list"
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default ClientOverview;
