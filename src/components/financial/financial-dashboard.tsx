'use client';

/**
 * Financial Intelligence Dashboard
 *
 * Displays financial metrics, KPIs, and AI-generated insights.
 * Implements Rolling 12 Month (R12) charts and budget comparisons.
 */

import React, { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  RefreshCw,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  cn,
  formatCurrency,
  formatPercentage,
  formatNumber,
  calculateVariance,
} from '@/lib/utils';
import type { FinancialPeriod } from '@/types/schema';

// ============================================================================
// TYPES
// ============================================================================

interface FinancialDashboardProps {
  periods: FinancialPeriod[];
  currentPeriod: FinancialPeriod;
  previousPeriod?: FinancialPeriod;
  aiAnalysis?: {
    summary: string;
    keyTrends: string[];
    concerns: string[];
    recommendations: string[];
    generatedAt: Date;
  };
  onRefreshAI?: () => Promise<void>;
  isLoadingAI?: boolean;
  currency?: string;
  locale?: string;
}

interface MetricCardProps {
  title: string;
  value: number;
  previousValue?: number;
  format: 'currency' | 'percentage' | 'number';
  icon?: React.ReactNode;
  description?: string;
  invertColors?: boolean;
  currency?: string;
  locale?: string;
}

// ============================================================================
// METRIC CARD
// ============================================================================

function MetricCard({
  title,
  value,
  previousValue,
  format,
  icon,
  description,
  invertColors = false,
  currency = 'SEK',
  locale = 'sv-SE',
}: MetricCardProps) {
  const variance = previousValue !== undefined ? calculateVariance(value, previousValue) : null;

  const formatValue = (v: number) => {
    switch (format) {
      case 'currency':
        return formatCurrency(v, currency, locale);
      case 'percentage':
        return formatPercentage(v);
      case 'number':
        return formatNumber(v, locale);
      default:
        return v.toString();
    }
  };

  const getVarianceColor = () => {
    if (!variance) return '';
    const isPositive = invertColors
      ? variance.direction === 'down'
      : variance.direction === 'up';
    if (variance.direction === 'unchanged') return 'text-muted-foreground';
    return isPositive ? 'text-green-600' : 'text-red-600';
  };

  const getVarianceIcon = () => {
    if (!variance || variance.direction === 'unchanged')
      return <Minus className="h-4 w-4" />;
    return variance.direction === 'up' ? (
      <ArrowUpRight className="h-4 w-4" />
    ) : (
      <ArrowDownRight className="h-4 w-4" />
    );
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{formatValue(value)}</p>
            {variance && (
              <div className={cn('flex items-center gap-1 text-sm', getVarianceColor())}>
                {getVarianceIcon()}
                <span>
                  {formatPercentage(Math.abs(variance.percentage))}
                  {description && ` ${description}`}
                </span>
              </div>
            )}
          </div>
          {icon && (
            <div className="rounded-lg bg-primary/10 p-2 text-primary">{icon}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// KPI GAUGE
// ============================================================================

interface KPIGaugeProps {
  label: string;
  value: number;
  target?: number;
  format: 'percentage' | 'ratio';
  thresholds?: { warning: number; danger: number };
}

function KPIGauge({ label, value, target, format, thresholds }: KPIGaugeProps) {
  const getStatus = () => {
    if (!thresholds) return 'normal';
    if (value <= thresholds.danger) return 'danger';
    if (value <= thresholds.warning) return 'warning';
    return 'good';
  };

  const status = getStatus();
  const statusColors = {
    good: 'bg-green-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
    normal: 'bg-blue-500',
  };

  const displayValue = format === 'percentage' ? formatPercentage(value) : value.toFixed(2);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {displayValue}
          {target && (
            <span className="text-muted-foreground ml-1">/ {format === 'percentage' ? formatPercentage(target) : target}</span>
          )}
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full transition-all', statusColors[status])}
          style={{ width: `${Math.min((value / (target || 100)) * 100, 100)}%` }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// AI INSIGHTS PANEL
// ============================================================================

interface AIInsightsPanelProps {
  analysis?: {
    summary: string;
    keyTrends: string[];
    concerns: string[];
    recommendations: string[];
    generatedAt: Date;
  };
  onRefresh?: () => Promise<void>;
  isLoading?: boolean;
}

function AIInsightsPanel({ analysis, onRefresh, isLoading }: AIInsightsPanelProps) {
  if (!analysis) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Sparkles className="h-8 w-8 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">No AI analysis available yet</p>
          {onRefresh && (
            <Button onClick={onRefresh} isLoading={isLoading}>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Analysis
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">AI Financial Analysis</CardTitle>
          </div>
          {onRefresh && (
            <Button variant="ghost" size="sm" onClick={onRefresh} isLoading={isLoading}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
        <CardDescription>
          Generated {analysis.generatedAt.toLocaleDateString()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Executive Summary */}
        <div>
          <h4 className="font-medium mb-2">Executive Summary</h4>
          <p className="text-sm text-muted-foreground">{analysis.summary}</p>
        </div>

        {/* Key Trends */}
        {analysis.keyTrends.length > 0 && (
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Key Trends
            </h4>
            <ul className="space-y-1">
              {analysis.keyTrends.map((trend, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                  <span>{trend}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Concerns */}
        {analysis.concerns.length > 0 && (
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              Areas of Concern
            </h4>
            <ul className="space-y-1">
              {analysis.concerns.map((concern, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <span>{concern}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {analysis.recommendations.length > 0 && (
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-600" />
              Recommendations
            </h4>
            <ul className="space-y-1">
              {analysis.recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <span className="text-blue-600 font-medium">{idx + 1}.</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN DASHBOARD
// ============================================================================

export function FinancialDashboard({
  periods,
  currentPeriod,
  previousPeriod,
  aiAnalysis,
  onRefreshAI,
  isLoadingAI,
  currency = 'SEK',
  locale = 'sv-SE',
}: FinancialDashboardProps) {
  const [chartPeriod, setChartPeriod] = useState<'6m' | '12m' | 'ytd'>('12m');

  // Prepare chart data (Rolling 12 months)
  const chartData = useMemo(() => {
    const sorted = [...periods]
      .sort((a, b) => a.period.localeCompare(b.period))
      .slice(-12);

    return sorted.map((p) => ({
      period: p.period,
      revenue: p.incomeStatement.revenue,
      netIncome: p.incomeStatement.netIncome,
      grossProfit: p.incomeStatement.grossProfit,
      operatingIncome: p.incomeStatement.operatingIncome,
      ebitda: p.kpis.ebitda,
      budget: p.budget?.revenue || null,
      grossMargin: p.kpis.grossMargin,
      netMargin: p.kpis.netMargin,
    }));
  }, [periods]);

  const income = currentPeriod.incomeStatement;
  const balance = currentPeriod.balanceSheet;
  const kpis = currentPeriod.kpis;
  const prevIncome = previousPeriod?.incomeStatement;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Financial Overview</h1>
          <p className="text-muted-foreground">
            Period: {currentPeriod.period} ({currentPeriod.periodType})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={currentPeriod.status === 'final' ? 'success' : 'warning'}>
            {currentPeriod.status}
          </Badge>
          <Select value={chartPeriod} onValueChange={(v: '6m' | '12m' | 'ytd') => setChartPeriod(v)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6m">6 Months</SelectItem>
              <SelectItem value="12m">12 Months</SelectItem>
              <SelectItem value="ytd">Year to Date</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Revenue"
          value={income.revenue}
          previousValue={prevIncome?.revenue}
          format="currency"
          icon={<DollarSign className="h-5 w-5" />}
          description="vs last period"
          currency={currency}
          locale={locale}
        />
        <MetricCard
          title="Net Income"
          value={income.netIncome}
          previousValue={prevIncome?.netIncome}
          format="currency"
          icon={<TrendingUp className="h-5 w-5" />}
          description="vs last period"
          currency={currency}
          locale={locale}
        />
        <MetricCard
          title="EBITDA"
          value={kpis.ebitda}
          previousValue={previousPeriod?.kpis.ebitda}
          format="currency"
          icon={<BarChart3 className="h-5 w-5" />}
          description="vs last period"
          currency={currency}
          locale={locale}
        />
        <MetricCard
          title="Cash Balance"
          value={balance.cashAndEquivalents}
          previousValue={previousPeriod?.balanceSheet.cashAndEquivalents}
          format="currency"
          icon={<PieChart className="h-5 w-5" />}
          description="vs last period"
          currency={currency}
          locale={locale}
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="profitability">Profitability</TabsTrigger>
          <TabsTrigger value="balance">Balance Sheet</TabsTrigger>
          <TabsTrigger value="kpis">KPIs</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Revenue Chart */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Revenue & Net Income (R12)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" tickFormatter={(v) => v.slice(5)} />
                      <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                      <Tooltip
                        formatter={(value) => typeof value === 'number' ? formatCurrency(value, currency, locale) : value}
                      />
                      <Legend />
                      <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" />
                      <Line
                        type="monotone"
                        dataKey="netIncome"
                        name="Net Income"
                        stroke="#10b981"
                        strokeWidth={2}
                      />
                      {chartData[0]?.budget && (
                        <Line
                          type="monotone"
                          dataKey="budget"
                          name="Budget"
                          stroke="#f59e0b"
                          strokeDasharray="5 5"
                        />
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* AI Insights */}
            <AIInsightsPanel
              analysis={aiAnalysis}
              onRefresh={onRefreshAI}
              isLoading={isLoadingAI}
            />
          </div>
        </TabsContent>

        {/* Profitability Tab */}
        <TabsContent value="profitability" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Margin Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Margin Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" tickFormatter={(v) => v.slice(5)} />
                      <YAxis tickFormatter={(v) => `${v}%`} />
                      <Tooltip formatter={(v) => typeof v === 'number' ? formatPercentage(v) : v} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="grossMargin"
                        name="Gross Margin"
                        stroke="#3b82f6"
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="netMargin"
                        name="Net Margin"
                        stroke="#10b981"
                        strokeWidth={2}
                      />
                      <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Income Statement Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Income Statement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span>Revenue</span>
                    <span className="font-medium">
                      {formatCurrency(income.revenue, currency, locale)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span>Cost of Goods Sold</span>
                    <span className="font-medium text-red-600">
                      ({formatCurrency(income.costOfGoodsSold, currency, locale)})
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b bg-muted/50 px-2 -mx-2">
                    <span className="font-medium">Gross Profit</span>
                    <span className="font-medium">
                      {formatCurrency(income.grossProfit, currency, locale)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span>Operating Expenses</span>
                    <span className="font-medium text-red-600">
                      ({formatCurrency(income.operatingExpenses, currency, locale)})
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b bg-muted/50 px-2 -mx-2">
                    <span className="font-medium">Operating Income (EBIT)</span>
                    <span className="font-medium">
                      {formatCurrency(income.operatingIncome, currency, locale)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span>Interest & Other</span>
                    <span className="font-medium">
                      {formatCurrency(
                        income.interestIncome - income.interestExpense + income.otherIncome - income.otherExpenses,
                        currency,
                        locale
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span>Tax Expense</span>
                    <span className="font-medium text-red-600">
                      ({formatCurrency(income.taxExpense, currency, locale)})
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 bg-primary/10 px-2 -mx-2 rounded">
                    <span className="font-bold">Net Income</span>
                    <span className={cn('font-bold', income.netIncome >= 0 ? 'text-green-600' : 'text-red-600')}>
                      {formatCurrency(income.netIncome, currency, locale)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Balance Sheet Tab */}
        <TabsContent value="balance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Assets */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Assets</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Current Assets</p>
                  <div className="flex justify-between text-sm">
                    <span>Cash & Equivalents</span>
                    <span>{formatCurrency(balance.cashAndEquivalents, currency, locale)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Accounts Receivable</span>
                    <span>{formatCurrency(balance.accountsReceivable, currency, locale)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Inventory</span>
                    <span>{formatCurrency(balance.inventory, currency, locale)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium border-t pt-2">
                    <span>Total Current</span>
                    <span>{formatCurrency(balance.totalCurrentAssets, currency, locale)}</span>
                  </div>
                </div>
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-sm font-medium text-muted-foreground">Non-Current Assets</p>
                  <div className="flex justify-between text-sm">
                    <span>PP&E</span>
                    <span>{formatCurrency(balance.propertyPlantEquipment, currency, locale)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Intangibles</span>
                    <span>{formatCurrency(balance.intangibleAssets, currency, locale)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium border-t pt-2">
                    <span>Total Non-Current</span>
                    <span>{formatCurrency(balance.totalNonCurrentAssets, currency, locale)}</span>
                  </div>
                </div>
                <div className="flex justify-between font-bold bg-primary/10 p-2 -mx-2 rounded">
                  <span>Total Assets</span>
                  <span>{formatCurrency(balance.totalAssets, currency, locale)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Liabilities */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Liabilities</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Current Liabilities</p>
                  <div className="flex justify-between text-sm">
                    <span>Accounts Payable</span>
                    <span>{formatCurrency(balance.accountsPayable, currency, locale)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Short-term Debt</span>
                    <span>{formatCurrency(balance.shortTermDebt, currency, locale)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium border-t pt-2">
                    <span>Total Current</span>
                    <span>{formatCurrency(balance.totalCurrentLiabilities, currency, locale)}</span>
                  </div>
                </div>
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-sm font-medium text-muted-foreground">Non-Current Liabilities</p>
                  <div className="flex justify-between text-sm">
                    <span>Long-term Debt</span>
                    <span>{formatCurrency(balance.longTermDebt, currency, locale)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium border-t pt-2">
                    <span>Total Non-Current</span>
                    <span>{formatCurrency(balance.totalNonCurrentLiabilities, currency, locale)}</span>
                  </div>
                </div>
                <div className="flex justify-between font-bold bg-red-50 p-2 -mx-2 rounded text-red-700">
                  <span>Total Liabilities</span>
                  <span>{formatCurrency(balance.totalLiabilities, currency, locale)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Equity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Equity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Common Stock</span>
                    <span>{formatCurrency(balance.commonStock, currency, locale)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Retained Earnings</span>
                    <span>{formatCurrency(balance.retainedEarnings, currency, locale)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Other Equity</span>
                    <span>{formatCurrency(balance.otherEquity, currency, locale)}</span>
                  </div>
                </div>
                <div className="flex justify-between font-bold bg-green-50 p-2 -mx-2 rounded text-green-700">
                  <span>Total Equity</span>
                  <span>{formatCurrency(balance.totalEquity, currency, locale)}</span>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex justify-between font-bold">
                    <span>Liabilities + Equity</span>
                    <span>
                      {formatCurrency(balance.totalLiabilities + balance.totalEquity, currency, locale)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* KPIs Tab */}
        <TabsContent value="kpis" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Profitability KPIs */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Profitability</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <KPIGauge
                  label="Gross Margin"
                  value={kpis.grossMargin}
                  target={40}
                  format="percentage"
                  thresholds={{ warning: 25, danger: 15 }}
                />
                <KPIGauge
                  label="Operating Margin"
                  value={kpis.operatingMargin}
                  target={15}
                  format="percentage"
                  thresholds={{ warning: 8, danger: 3 }}
                />
                <KPIGauge
                  label="Net Margin"
                  value={kpis.netMargin}
                  target={10}
                  format="percentage"
                  thresholds={{ warning: 5, danger: 0 }}
                />
                <KPIGauge
                  label="EBITDA Margin"
                  value={kpis.ebitdaMargin}
                  target={20}
                  format="percentage"
                  thresholds={{ warning: 10, danger: 5 }}
                />
              </CardContent>
            </Card>

            {/* Liquidity KPIs */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Liquidity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <KPIGauge
                  label="Current Ratio"
                  value={kpis.currentRatio}
                  target={2}
                  format="ratio"
                  thresholds={{ warning: 1.2, danger: 1 }}
                />
                <KPIGauge
                  label="Quick Ratio"
                  value={kpis.quickRatio}
                  target={1}
                  format="ratio"
                  thresholds={{ warning: 0.8, danger: 0.5 }}
                />
                <div className="pt-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Working Capital</span>
                    <span className={cn('font-medium', kpis.workingCapital >= 0 ? 'text-green-600' : 'text-red-600')}>
                      {formatCurrency(kpis.workingCapital, currency, locale)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Returns & Leverage */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Returns & Leverage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <KPIGauge
                  label="Return on Equity (ROE)"
                  value={kpis.returnOnEquity}
                  target={15}
                  format="percentage"
                  thresholds={{ warning: 8, danger: 3 }}
                />
                <KPIGauge
                  label="Return on Assets (ROA)"
                  value={kpis.returnOnAssets}
                  target={10}
                  format="percentage"
                  thresholds={{ warning: 5, danger: 2 }}
                />
                <KPIGauge
                  label="Debt to Equity"
                  value={kpis.debtToEquity}
                  target={1}
                  format="ratio"
                  thresholds={{ warning: 1.5, danger: 2 }}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default FinancialDashboard;
