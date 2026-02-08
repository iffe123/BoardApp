'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import {
  RefreshCw,
  Download,
  Settings,
  TrendingUp,
  TrendingDown,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FinancialDashboard } from '@/components/financial/financial-dashboard';
import { usePermissions } from '@/contexts/auth-context';
import { formatCurrency } from '@/lib/utils';
import type { FinancialPeriod } from '@/types/schema';
import { Timestamp } from 'firebase/firestore';

// Mock financial data
const mockFinancialPeriods: FinancialPeriod[] = [
  {
    id: '2024-01',
    tenantId: 'tenant1',
    period: '2024-01',
    periodType: 'monthly',
    fiscalYear: 2024,
    incomeStatement: {
      revenue: 2500000,
      costOfGoodsSold: 1500000,
      grossProfit: 1000000,
      operatingExpenses: 600000,
      operatingIncome: 400000,
      interestExpense: 20000,
      interestIncome: 5000,
      otherIncome: 10000,
      otherExpenses: 5000,
      taxExpense: 80000,
      netIncome: 310000,
    },
    balanceSheet: {
      cashAndEquivalents: 4200000,
      accountsReceivable: 1800000,
      inventory: 500000,
      prepaidExpenses: 100000,
      otherCurrentAssets: 50000,
      totalCurrentAssets: 6650000,
      propertyPlantEquipment: 2000000,
      intangibleAssets: 500000,
      longTermInvestments: 300000,
      otherNonCurrentAssets: 100000,
      totalNonCurrentAssets: 2900000,
      totalAssets: 9550000,
      accountsPayable: 800000,
      shortTermDebt: 200000,
      accruedLiabilities: 300000,
      otherCurrentLiabilities: 100000,
      totalCurrentLiabilities: 1400000,
      longTermDebt: 1500000,
      deferredTaxLiabilities: 150000,
      otherNonCurrentLiabilities: 100000,
      totalNonCurrentLiabilities: 1750000,
      totalLiabilities: 3150000,
      commonStock: 1000000,
      retainedEarnings: 5400000,
      otherEquity: 0,
      totalEquity: 6400000,
    },
    cashFlow: {
      operatingCashFlow: 450000,
      investingCashFlow: -100000,
      financingCashFlow: -50000,
      netCashFlow: 300000,
      beginningCash: 3900000,
      endingCash: 4200000,
    },
    kpis: {
      grossMargin: 0.40,
      operatingMargin: 0.16,
      netMargin: 0.124,
      ebitda: 500000,
      ebitdaMargin: 0.20,
      currentRatio: 4.75,
      quickRatio: 4.39,
      debtToEquity: 0.27,
      returnOnEquity: 0.048,
      returnOnAssets: 0.032,
      workingCapital: 5250000,
    },
    source: 'fortnox',
    sourceMetadata: {
      importedAt: Timestamp.now(),
      importedBy: 'system',
      lastSyncAt: Timestamp.now(),
    },
    status: 'final',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    createdBy: 'system',
  },
];

// Generate 12 months of rolling data
const generateRollingData = () => {
  const months = [];
  const baseRevenue = 2500000;
  for (let i = 11; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const month = date.toISOString().slice(0, 7);
    const seasonalFactor = 1 + Math.sin((date.getMonth() / 12) * Math.PI * 2) * 0.15;
    const revenue = Math.round(baseRevenue * seasonalFactor * (0.95 + Math.random() * 0.1));
    const netIncome = Math.round(revenue * (0.10 + Math.random() * 0.05));

    months.push({
      period: month,
      revenue,
      netIncome,
      ebitda: Math.round(revenue * 0.20),
      cashBalance: 4000000 + Math.round(Math.random() * 500000),
    });
  }
  return months;
};

const rollingData = generateRollingData();
void rollingData; // Prepared for rolling chart feature

export default function FinancialsPage() {
  const params = useParams();
  void params.tenantId; // Used for routing
  const { canViewFinancials } = usePermissions();

  const [selectedPeriod, setSelectedPeriod] = useState('2024-01');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const currentPeriod = mockFinancialPeriods[0]!;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsRefreshing(false);
  };

  // Access denied for non-financial users
  if (!canViewFinancials) {
    return (
      <div className="p-8">
        <Card className="p-12 text-center">
          <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
          <p className="text-muted-foreground">
            You don&apos;t have permission to view financial data.
            Contact your administrator for access.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Intelligence</h1>
          <p className="text-muted-foreground mt-1">
            Real-time financial dashboards and AI-powered insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024-01">January 2024</SelectItem>
              <SelectItem value="2023-12">December 2023</SelectItem>
              <SelectItem value="2023-11">November 2023</SelectItem>
              <SelectItem value="2023-Q4">Q4 2023</SelectItem>
              <SelectItem value="2023-FY">FY 2023</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Sync
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            ERP Settings
          </Button>
        </div>
      </div>

      {/* Key Metrics Summary */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Revenue (MTD)</p>
                <p className="text-2xl font-bold">{formatCurrency(currentPeriod.incomeStatement.revenue, 'SEK')}</p>
                <div className="flex items-center text-sm text-green-600 mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +8.5% vs last month
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Net Income</p>
                <p className="text-2xl font-bold">{formatCurrency(currentPeriod.incomeStatement.netIncome, 'SEK')}</p>
                <div className="flex items-center text-sm text-red-600 mt-1">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  -2.3% vs last month
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">EBITDA</p>
                <p className="text-2xl font-bold">{formatCurrency(currentPeriod.kpis.ebitda, 'SEK')}</p>
                <div className="flex items-center text-sm text-green-600 mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +5.2% vs last month
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Cash Balance</p>
                <p className="text-2xl font-bold">{formatCurrency(currentPeriod.balanceSheet.cashAndEquivalents, 'SEK')}</p>
                <div className="flex items-center text-sm text-green-600 mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +15.2% vs last month
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Dashboard Component */}
      <FinancialDashboard
        periods={mockFinancialPeriods}
        currentPeriod={currentPeriod}
        onRefreshAI={handleRefresh}
      />

      {/* AI Insights */}
      <Card className="mt-8">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>AI-Powered Insights</CardTitle>
          </div>
          <CardDescription>
            Analysis generated by Claude based on your financial data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-lg bg-green-50 border border-green-200">
              <h4 className="font-medium text-green-800 mb-2">Positive Trends</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Revenue growth of 8.5% exceeds industry average</li>
                <li>• Strong cash position with 4.75x current ratio</li>
                <li>• Working capital increased by 12% YoY</li>
              </ul>
            </div>

            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
              <h4 className="font-medium text-amber-800 mb-2">Areas to Monitor</h4>
              <ul className="text-sm text-amber-700 space-y-1">
                <li>• Net margin declined slightly to 12.4%</li>
                <li>• Operating expenses growing faster than revenue</li>
                <li>• Accounts receivable days increased to 45</li>
              </ul>
            </div>

            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
              <h4 className="font-medium text-blue-800 mb-2">Recommendations</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Review operating expense categories for optimization</li>
                <li>• Consider accelerating AR collection process</li>
                <li>• Evaluate investment opportunities with excess cash</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
