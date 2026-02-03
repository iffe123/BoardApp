'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import {
  RefreshCw,
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PiggyBank,
  CreditCard,
  BarChart3,
  ChevronDown,
} from 'lucide-react';
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
      // Assets
      cashAndEquivalents: 4200000,
      accountsReceivable: 1800000,
      inventory: 950000,
      prepaidExpenses: 150000,
      otherCurrentAssets: 100000,
      totalCurrentAssets: 7200000,
      propertyPlantEquipment: 3500000,
      intangibleAssets: 800000,
      longTermInvestments: 500000,
      otherNonCurrentAssets: 300000,
      totalNonCurrentAssets: 5100000,
      totalAssets: 12300000,
      // Liabilities
      accountsPayable: 1200000,
      shortTermDebt: 500000,
      accruedLiabilities: 200000,
      otherCurrentLiabilities: 100000,
      totalCurrentLiabilities: 2000000,
      longTermDebt: 2000000,
      deferredTaxLiabilities: 300000,
      otherNonCurrentLiabilities: 200000,
      totalNonCurrentLiabilities: 2500000,
      totalLiabilities: 4500000,
      // Equity
      commonStock: 3000000,
      retainedEarnings: 4500000,
      otherEquity: 300000,
      totalEquity: 7800000,
    },
    cashFlow: {
      operatingCashFlow: 450000,
      investingCashFlow: -200000,
      financingCashFlow: -100000,
      netCashFlow: 150000,
      beginningCash: 4050000,
      endingCash: 4200000,
    },
    kpis: {
      grossMargin: 0.40,
      operatingMargin: 0.16,
      netMargin: 0.124,
      ebitda: 450000,
      ebitdaMargin: 0.18,
      currentRatio: 4.12,
      quickRatio: 3.56,
      debtToEquity: 0.49,
      returnOnEquity: 0.163,
      returnOnAssets: 0.11,
      workingCapital: 5200000,
    },
    source: 'fortnox',
    sourceMetadata: {
      importedAt: Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
      importedBy: 'user1',
      lastSyncAt: Timestamp.fromDate(new Date(Date.now() - 2 * 60 * 60 * 1000)),
    },
    status: 'final',
    createdAt: Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
    updatedAt: Timestamp.fromDate(new Date(Date.now() - 2 * 60 * 60 * 1000)),
    createdBy: 'user1',
  },
];

// Previous period for comparison
const mockPreviousPeriod = {
  revenue: 2300000,
  netIncome: 290000,
  grossMargin: 0.38,
  cashAndEquivalents: 3900000,
};

export default function FinancialsPage() {
  const params = useParams();
  void params.tenantId;
  const { canViewFinancials } = usePermissions();

  const [selectedPeriod, setSelectedPeriod] = useState('2024-01');
  const [periodOpen, setPeriodOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const currentPeriod = mockFinancialPeriods.find((p) => p.period === selectedPeriod);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsRefreshing(false);
  };

  const calculateChange = (current: number, previous: number) => {
    return ((current - previous) / previous) * 100;
  };

  if (!canViewFinancials) {
    return (
      <div className="p-8 text-white">
        <div className="rounded-xl bg-white/[0.02] p-12 text-center">
          <BarChart3 className="h-12 w-12 mx-auto text-white/20 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
          <p className="text-white/50">
            You don&apos;t have permission to view financial data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financials</h1>
          <p className="text-white/50 mt-1">
            Financial overview and key metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setPeriodOpen(!periodOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/70 hover:bg-white/10 transition-colors"
            >
              January 2024
              <ChevronDown className="h-4 w-4" />
            </button>
            {periodOpen && (
              <div className="absolute top-full right-0 mt-1 py-1 bg-[#141414] border border-white/10 rounded-lg shadow-xl z-50 min-w-[160px]">
                {['January 2024', 'December 2023', 'November 2023', 'October 2023'].map((period) => (
                  <button
                    key={period}
                    onClick={() => { setSelectedPeriod('2024-01'); setPeriodOpen(false); }}
                    className="w-full px-3 py-2 text-sm text-left text-white/70 hover:bg-white/5"
                  >
                    {period}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/70 hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Sync
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-white text-black font-medium rounded-lg hover:bg-white/90 transition-colors">
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-10">
        <div className="p-6 rounded-xl bg-white/[0.02]">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <DollarSign className="h-5 w-5 text-blue-400" />
            </div>
            {currentPeriod && (
              <span className={`flex items-center text-sm ${calculateChange(currentPeriod.incomeStatement.revenue, mockPreviousPeriod.revenue) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {calculateChange(currentPeriod.incomeStatement.revenue, mockPreviousPeriod.revenue) >= 0 ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                {Math.abs(calculateChange(currentPeriod.incomeStatement.revenue, mockPreviousPeriod.revenue)).toFixed(1)}%
              </span>
            )}
          </div>
          <p className="text-sm text-white/40 mb-1">Revenue</p>
          <p className="text-2xl font-bold">
            {currentPeriod ? formatCurrency(currentPeriod.incomeStatement.revenue, 'SEK') : '-'}
          </p>
        </div>

        <div className="p-6 rounded-xl bg-white/[0.02]">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
            </div>
            {currentPeriod && (
              <span className={`flex items-center text-sm ${calculateChange(currentPeriod.incomeStatement.netIncome, mockPreviousPeriod.netIncome) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {calculateChange(currentPeriod.incomeStatement.netIncome, mockPreviousPeriod.netIncome) >= 0 ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                {Math.abs(calculateChange(currentPeriod.incomeStatement.netIncome, mockPreviousPeriod.netIncome)).toFixed(1)}%
              </span>
            )}
          </div>
          <p className="text-sm text-white/40 mb-1">Net Income</p>
          <p className="text-2xl font-bold">
            {currentPeriod ? formatCurrency(currentPeriod.incomeStatement.netIncome, 'SEK') : '-'}
          </p>
        </div>

        <div className="p-6 rounded-xl bg-white/[0.02]">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <PiggyBank className="h-5 w-5 text-purple-400" />
            </div>
            {currentPeriod && (
              <span className={`flex items-center text-sm ${calculateChange(currentPeriod.balanceSheet.cashAndEquivalents, mockPreviousPeriod.cashAndEquivalents) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {calculateChange(currentPeriod.balanceSheet.cashAndEquivalents, mockPreviousPeriod.cashAndEquivalents) >= 0 ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                {Math.abs(calculateChange(currentPeriod.balanceSheet.cashAndEquivalents, mockPreviousPeriod.cashAndEquivalents)).toFixed(1)}%
              </span>
            )}
          </div>
          <p className="text-sm text-white/40 mb-1">Cash Balance</p>
          <p className="text-2xl font-bold">
            {currentPeriod ? formatCurrency(currentPeriod.balanceSheet.cashAndEquivalents, 'SEK') : '-'}
          </p>
        </div>

        <div className="p-6 rounded-xl bg-white/[0.02]">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <CreditCard className="h-5 w-5 text-amber-400" />
            </div>
            {currentPeriod && (
              <span className={`flex items-center text-sm ${(currentPeriod.kpis.grossMargin - mockPreviousPeriod.grossMargin) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {(currentPeriod.kpis.grossMargin - mockPreviousPeriod.grossMargin) >= 0 ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                {Math.abs((currentPeriod.kpis.grossMargin - mockPreviousPeriod.grossMargin) * 100).toFixed(1)}pp
              </span>
            )}
          </div>
          <p className="text-sm text-white/40 mb-1">Gross Margin</p>
          <p className="text-2xl font-bold">
            {currentPeriod ? `${(currentPeriod.kpis.grossMargin * 100).toFixed(1)}%` : '-'}
          </p>
        </div>
      </div>

      {/* Income Statement & Balance Sheet */}
      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        {/* Income Statement */}
        <div className="rounded-xl bg-white/[0.02] p-6">
          <h2 className="text-lg font-semibold mb-6">Income Statement</h2>
          {currentPeriod && (
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-white/70">Revenue</span>
                <span className="font-medium">{formatCurrency(currentPeriod.incomeStatement.revenue, 'SEK')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Cost of Goods Sold</span>
                <span className="text-white/70">-{formatCurrency(currentPeriod.incomeStatement.costOfGoodsSold, 'SEK')}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-white/5 pt-4">
                <span className="text-white/70">Gross Profit</span>
                <span className="font-medium">{formatCurrency(currentPeriod.incomeStatement.grossProfit, 'SEK')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Operating Expenses</span>
                <span className="text-white/70">-{formatCurrency(currentPeriod.incomeStatement.operatingExpenses, 'SEK')}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-white/5 pt-4">
                <span className="text-white/70">Operating Income</span>
                <span className="font-medium">{formatCurrency(currentPeriod.incomeStatement.operatingIncome, 'SEK')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Tax Expense</span>
                <span className="text-white/70">-{formatCurrency(currentPeriod.incomeStatement.taxExpense, 'SEK')}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-white/5 pt-4">
                <span className="font-medium">Net Income</span>
                <span className="font-bold text-emerald-400">{formatCurrency(currentPeriod.incomeStatement.netIncome, 'SEK')}</span>
              </div>
            </div>
          )}
        </div>

        {/* Balance Sheet */}
        <div className="rounded-xl bg-white/[0.02] p-6">
          <h2 className="text-lg font-semibold mb-6">Balance Sheet</h2>
          {currentPeriod && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-white/50 mb-3">Assets</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/50">Cash & Equivalents</span>
                    <span className="text-white/70">{formatCurrency(currentPeriod.balanceSheet.cashAndEquivalents, 'SEK')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">Accounts Receivable</span>
                    <span className="text-white/70">{formatCurrency(currentPeriod.balanceSheet.accountsReceivable, 'SEK')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">Inventory</span>
                    <span className="text-white/70">{formatCurrency(currentPeriod.balanceSheet.inventory, 'SEK')}</span>
                  </div>
                  <div className="flex justify-between border-t border-white/5 pt-2">
                    <span className="text-white/70">Total Assets</span>
                    <span className="font-medium">{formatCurrency(currentPeriod.balanceSheet.totalAssets, 'SEK')}</span>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-white/50 mb-3">Liabilities & Equity</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/50">Total Liabilities</span>
                    <span className="text-white/70">{formatCurrency(currentPeriod.balanceSheet.totalLiabilities, 'SEK')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">Equity</span>
                    <span className="text-white/70">{formatCurrency(currentPeriod.balanceSheet.totalEquity, 'SEK')}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Key Ratios */}
      <div className="rounded-xl bg-white/[0.02] p-6">
        <h2 className="text-lg font-semibold mb-6">Key Ratios</h2>
        {currentPeriod && (
          <div className="grid gap-6 md:grid-cols-4">
            <div>
              <p className="text-sm text-white/40 mb-1">Operating Margin</p>
              <p className="text-xl font-bold">{(currentPeriod.kpis.operatingMargin * 100).toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-sm text-white/40 mb-1">Net Margin</p>
              <p className="text-xl font-bold">{(currentPeriod.kpis.netMargin * 100).toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-sm text-white/40 mb-1">Current Ratio</p>
              <p className="text-xl font-bold">{currentPeriod.kpis.currentRatio.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-white/40 mb-1">Debt to Equity</p>
              <p className="text-xl font-bold">{currentPeriod.kpis.debtToEquity.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-white/40 mb-1">Return on Equity</p>
              <p className="text-xl font-bold">{(currentPeriod.kpis.returnOnEquity * 100).toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-sm text-white/40 mb-1">Return on Assets</p>
              <p className="text-xl font-bold">{(currentPeriod.kpis.returnOnAssets * 100).toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-sm text-white/40 mb-1">Quick Ratio</p>
              <p className="text-xl font-bold">{currentPeriod.kpis.quickRatio.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-white/40 mb-1">Last Synced</p>
              <p className="text-xl font-bold">2h ago</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
