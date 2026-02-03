/**
 * Financial Analysis API Route
 *
 * Uses Anthropic Claude to analyze financial data and generate
 * executive summaries with insights for the Board of Directors.
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { formatCurrency, formatPercentage } from '@/lib/utils';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

interface FinancialPeriodData {
  period: string;
  revenue: number;
  costOfGoodsSold: number;
  grossProfit: number;
  operatingExpenses: number;
  operatingIncome: number;
  netIncome: number;
  ebitda: number;
  grossMargin: number;
  operatingMargin: number;
  netMargin: number;
  cashBalance: number;
  accountsReceivable: number;
  totalAssets: number;
  totalLiabilities: number;
  currentRatio: number;
  debtToEquity: number;
}

interface AnalysisRequest {
  periods: FinancialPeriodData[];
  currency?: string;
  locale?: string;
  companyName?: string;
}

interface AnalysisResponse {
  summary: string;
  keyTrends: string[];
  concerns: string[];
  recommendations: string[];
}

// Format financial data as markdown table for the prompt
function formatFinancialTable(periods: FinancialPeriodData[], currency: string): string {
  const headers = [
    'Period',
    'Revenue',
    'Gross Profit',
    'EBITDA',
    'Net Income',
    'Gross Margin',
    'Net Margin',
    'Cash',
    'Current Ratio',
  ];

  let table = `| ${headers.join(' | ')} |\n`;
  table += `| ${headers.map(() => '---').join(' | ')} |\n`;

  for (const p of periods) {
    const row = [
      p.period,
      formatCurrency(p.revenue, currency),
      formatCurrency(p.grossProfit, currency),
      formatCurrency(p.ebitda, currency),
      formatCurrency(p.netIncome, currency),
      formatPercentage(p.grossMargin),
      formatPercentage(p.netMargin),
      formatCurrency(p.cashBalance, currency),
      p.currentRatio.toFixed(2),
    ];
    table += `| ${row.join(' | ')} |\n`;
  }

  return table;
}

// Calculate period-over-period variances
function calculateVariances(periods: FinancialPeriodData[]): string {
  if (periods.length < 2) return 'Insufficient data for variance analysis.';

  const current = periods[periods.length - 1];
  const previous = periods[periods.length - 2];

  const variances: string[] = [];

  const revenueChange = ((current.revenue - previous.revenue) / previous.revenue) * 100;
  const netIncomeChange = previous.netIncome !== 0
    ? ((current.netIncome - previous.netIncome) / Math.abs(previous.netIncome)) * 100
    : current.netIncome > 0 ? 100 : -100;
  const marginChange = current.netMargin - previous.netMargin;
  const cashChange = current.cashBalance - previous.cashBalance;

  variances.push(`Revenue: ${revenueChange > 0 ? '+' : ''}${revenueChange.toFixed(1)}% (${previous.period} to ${current.period})`);
  variances.push(`Net Income: ${netIncomeChange > 0 ? '+' : ''}${netIncomeChange.toFixed(1)}%`);
  variances.push(`Net Margin: ${marginChange > 0 ? '+' : ''}${marginChange.toFixed(1)} percentage points`);
  variances.push(`Cash Position Change: ${cashChange > 0 ? '+' : ''}${formatCurrency(cashChange, 'SEK')}`);

  return variances.join('\n');
}

export async function POST(request: NextRequest) {
  try {
    const body: AnalysisRequest = await request.json();
    const { periods, currency = 'SEK', companyName = 'the company' } = body;

    if (!periods || periods.length === 0) {
      return NextResponse.json(
        { error: 'No financial data provided' },
        { status: 400 }
      );
    }

    // Sort periods chronologically
    const sortedPeriods = [...periods].sort((a, b) => a.period.localeCompare(b.period));

    // Take the last 3 periods for focused analysis
    const recentPeriods = sortedPeriods.slice(-3);

    const financialTable = formatFinancialTable(recentPeriods, currency);
    const variances = calculateVariances(recentPeriods);

    const systemPrompt = `You are an experienced CFO and financial analyst. Your task is to analyze financial data and provide actionable insights for the Board of Directors. Be concise, professional, and focus on the most important trends and issues.

Guidelines:
- Focus on the "why" behind the numbers, not just the "what"
- Identify both positive and concerning trends
- Provide specific, actionable recommendations
- Use business language appropriate for board-level discussions
- Be objective and balanced in your assessment
- Keep the executive summary to 100-150 words`;

    const userPrompt = `Analyze the following financial results for ${companyName}. Provide insights for the Board of Directors.

## Financial Data (Last 3 Periods)
${financialTable}

## Period-over-Period Variances
${variances}

Please provide your analysis in the following JSON format:
{
  "summary": "A concise 100-150 word executive summary highlighting the most important insights",
  "keyTrends": ["Array of 2-4 positive or neutral trends identified"],
  "concerns": ["Array of 1-3 areas of concern or risk"],
  "recommendations": ["Array of 2-4 specific, actionable recommendations"]
}

Respond with only the JSON object, no additional text.`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      system: systemPrompt,
    });

    // Extract the text content
    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from AI');
    }

    // Parse the JSON response
    let analysis: AnalysisResponse;
    try {
      // Try to extract JSON from the response (handle potential markdown code blocks)
      let jsonStr = textContent.text;
      const jsonMatch = jsonStr.match(/```json?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }
      analysis = JSON.parse(jsonStr);
    } catch {
      // If parsing fails, create a structured response from the text
      analysis = {
        summary: textContent.text.slice(0, 500),
        keyTrends: ['Analysis completed but structured parsing failed'],
        concerns: [],
        recommendations: ['Review raw AI output for detailed insights'],
      };
    }

    return NextResponse.json({
      ...analysis,
      generatedAt: new Date().toISOString(),
      model: 'claude-3-5-sonnet',
      periodsAnalyzed: recentPeriods.length,
    });
  } catch (error) {
    console.error('Financial analysis error:', error);

    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `AI API error: ${error.message}` },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate financial analysis' },
      { status: 500 }
    );
  }
}
