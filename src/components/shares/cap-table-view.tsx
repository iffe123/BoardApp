'use client';

/**
 * Cap Table Visualization
 *
 * Visual representation of the ownership structure using
 * Recharts pie and bar charts.
 */

import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatNumber, formatPercentage } from '@/lib/utils';
import type { CapTableSummary } from '@/types/schema';

// ============================================================================
// TYPES
// ============================================================================

interface CapTableViewProps {
  capTable: CapTableSummary;
  currency?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#6366f1',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#8b5cf6',
];

// ============================================================================
// COMPONENT
// ============================================================================

export function CapTableView({ capTable, currency = 'SEK' }: CapTableViewProps) {
  const ownershipData = capTable.shareholders.map((sh, i) => ({
    name: sh.name,
    shares: sh.totalShares,
    ownership: Number(sh.ownershipPercentage.toFixed(2)),
    voting: Number(sh.votingPercentage.toFixed(2)),
    fill: COLORS[i % COLORS.length],
  }));

  const classData = capTable.shareClasses.map((sc, i) => ({
    name: `Klass ${sc.class}`,
    shares: sc.totalShares,
    votes: sc.totalVotes,
    percentage: Number(sc.percentage.toFixed(2)),
    fill: COLORS[i % COLORS.length],
  }));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Totalt antal aktier</CardDescription>
            <CardTitle className="text-2xl">{formatNumber(capTable.totalShares)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Aktiekapital</CardDescription>
            <CardTitle className="text-2xl">
              {formatNumber(capTable.totalShareCapital)} {currency}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Aktieslag</CardDescription>
            <CardTitle className="text-2xl">{capTable.shareClasses.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-1 flex-wrap">
              {capTable.shareClasses.map((sc) => (
                <Badge key={sc.class} variant="secondary">
                  {sc.class}: {formatNumber(sc.totalShares)}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Ownership Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Ägarstruktur</CardTitle>
            <CardDescription>Ägarandel per aktieägare</CardDescription>
          </CardHeader>
          <CardContent>
            {ownershipData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={ownershipData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, payload }) => `${name} (${(payload as Record<string, number>)?.ownership ?? 0}%)`}
                    outerRadius={100}
                    dataKey="shares"
                  >
                    {ownershipData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) =>
                      name === 'shares'
                        ? [formatNumber(typeof value === 'number' ? value : 0), 'Aktier']
                        : [value ?? 0, name]
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                Inga aktier registrerade
              </div>
            )}
          </CardContent>
        </Card>

        {/* Voting Power Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Rösträtt</CardTitle>
            <CardDescription>Ägarandel vs Röstandel</CardDescription>
          </CardHeader>
          <CardContent>
            {ownershipData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={ownershipData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => typeof v === 'number' ? `${v}%` : v} />
                  <Legend />
                  <Bar dataKey="ownership" name="Ägarandel" fill="hsl(var(--chart-1))" />
                  <Bar dataKey="voting" name="Röstandel" fill="hsl(var(--chart-2))" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                Inga aktier registrerade
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Share Classes */}
      {classData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Aktieslag</CardTitle>
            <CardDescription>Fördelning per aktieslag</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={classData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(v) => typeof v === 'number' ? formatNumber(v) : v} />
                <Legend />
                <Bar dataKey="shares" name="Aktier" fill="hsl(var(--chart-1))" />
                <Bar dataKey="votes" name="Röster" fill="hsl(var(--chart-3))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Shareholder Table */}
      <Card>
        <CardHeader>
          <CardTitle>Aktieägare</CardTitle>
          <CardDescription>Detaljerad ägarförteckning</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium">Namn</th>
                  <th className="text-right py-3 px-2 font-medium">Antal aktier</th>
                  <th className="text-right py-3 px-2 font-medium">Ägarandel</th>
                  <th className="text-right py-3 px-2 font-medium">Röster</th>
                  <th className="text-right py-3 px-2 font-medium">Röstandel</th>
                  <th className="text-left py-3 px-2 font-medium">Aktieslag</th>
                </tr>
              </thead>
              <tbody>
                {capTable.shareholders.map((sh) => (
                  <tr key={sh.shareholderId} className="border-b last:border-0">
                    <td className="py-3 px-2 font-medium">{sh.name}</td>
                    <td className="py-3 px-2 text-right">{formatNumber(sh.totalShares)}</td>
                    <td className="py-3 px-2 text-right">{formatPercentage(sh.ownershipPercentage)}</td>
                    <td className="py-3 px-2 text-right">{formatNumber(sh.totalVotes)}</td>
                    <td className="py-3 px-2 text-right">{formatPercentage(sh.votingPercentage)}</td>
                    <td className="py-3 px-2">
                      <div className="flex gap-1 flex-wrap">
                        {Object.entries(sh.sharesByClass).map(([cls, count]) => (
                          <Badge key={cls} variant="outline" className="text-xs">
                            {cls}: {formatNumber(count ?? 0)}
                          </Badge>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
                {capTable.shareholders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      Inga aktieägare registrerade. Lägg till aktieägare och registrera transaktioner.
                    </td>
                  </tr>
                )}
              </tbody>
              {capTable.shareholders.length > 0 && (
                <tfoot>
                  <tr className="border-t font-medium">
                    <td className="py-3 px-2">Totalt</td>
                    <td className="py-3 px-2 text-right">{formatNumber(capTable.totalShares)}</td>
                    <td className="py-3 px-2 text-right">100%</td>
                    <td className="py-3 px-2 text-right">
                      {formatNumber(capTable.shareClasses.reduce((sum, sc) => sum + sc.totalVotes, 0))}
                    </td>
                    <td className="py-3 px-2 text-right">100%</td>
                    <td className="py-3 px-2"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default CapTableView;
