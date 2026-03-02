'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface SummaryResponse {
  totalDecisionsLast12Months: number;
  decisionCompletionRate: number;
  openActionsCount: number;
  overdueCount: number;
  avgCompletionTime: number | null;
  actionsByOwner: Array<{ ownerUserId: string; count: number }>;
  impactCategoryBreakdown: Array<{ category: string; count: number }>;
  upcomingDeadlines: Array<{ id: string; title: string; dueDate: string; ownerUserId: string; status: string }>;
  boardPromises: Array<{ decisionId: string; title: string; decidedAt: string }>;
}

const COLORS = ['#2563eb', '#16a34a', '#ea580c', '#dc2626', '#6b7280'];

export default function ExecutionDashboardPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [summary, setSummary] = useState<SummaryResponse | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/execution/summary?tenantId=${tenantId}`);
    if (response.ok) {
      setSummary(await response.json());
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  const completionPercent = useMemo(() => Math.round((summary?.decisionCompletionRate || 0) * 100), [summary]);

  if (!summary) return <div className="p-8">Loading execution dashboard...</div>;

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold">Board Execution Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader><CardTitle>Total decisions (12m)</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{summary.totalDecisionsLast12Months}</CardContent></Card>
        <Card><CardHeader><CardTitle>Fully executed</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{completionPercent}%</CardContent></Card>
        <Card><CardHeader><CardTitle>Open actions</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{summary.openActionsCount}</CardContent></Card>
        <Card className="border-red-200"><CardHeader><CardTitle>Overdue actions</CardTitle></CardHeader><CardContent className="text-3xl font-bold text-red-600">{summary.overdueCount}</CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Impact category breakdown</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={summary.impactCategoryBreakdown} dataKey="count" nameKey="category" outerRadius={100} label>
                  {summary.impactCategoryBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Actions by owner</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {summary.actionsByOwner.map((owner) => (
              <div key={owner.ownerUserId} className="flex items-center justify-between border rounded px-3 py-2">
                <span>{owner.ownerUserId}</span>
                <Badge>{owner.count}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Upcoming deadlines</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {summary.upcomingDeadlines.map((item) => (
            <div key={item.id} className="flex justify-between border rounded p-3 items-center">
              <div>
                <div>{item.title}</div>
                <span className={item.status === 'overdue' ? 'text-red-600 font-semibold' : 'text-muted-foreground'}>{new Date(item.dueDate).toLocaleDateString()}</span>
              </div>
              {item.status !== 'done' && (
                <Button
                  size="sm"
                  onClick={async () => {
                    await fetch(`/api/actions/${item.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ tenantId, status: 'done' }),
                    });
                    await load();
                  }}
                >
                  Mark done
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Board promises (execution gaps)</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {summary.boardPromises.length === 0 ? 'No gaps detected.' : summary.boardPromises.map((decision) => (
            <div key={decision.decisionId} className="flex items-center gap-2 p-3 border rounded bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span>{decision.title}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
