/**
 * Gemini AI Analysis API Route
 *
 * Server-side endpoint for AI analysis using Google Gemini.
 * Calls the Gemini API directly with proxy support for all environments.
 *
 * Requires GEMINI_API_KEY in .env.local (get from https://aistudio.google.com/apikey)
 * OR falls back to NEXT_PUBLIC_FIREBASE_API_KEY.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ProxyAgent } from 'undici';

// =============================================================================
// Types
// =============================================================================

type AnalysisType =
  | 'risk_assessment'
  | 'financial_health'
  | 'cashflow_analysis'
  | 'meeting_summary'
  | 'action_extraction'
  | 'follow_up_suggestions'
  | 'compliance_check'
  | 'comprehensive';

interface GeminiAnalysisRequest {
  analysisType: AnalysisType;
  financialData?: Array<{
    period: string;
    revenue: number;
    expenses: number;
    netIncome: number;
    cashBalance: number;
    accountsReceivable: number;
    accountsPayable: number;
    grossMargin?: number;
    currentRatio?: number;
  }>;
  meetingData?: {
    meeting: Record<string, unknown>;
    notes?: string;
    transcript?: string;
  };
  context?: {
    companyName?: string;
    industry?: string;
    companySize?: string;
    locale?: 'en' | 'sv';
    customPrompt?: string;
  };
}

// =============================================================================
// Constants
// =============================================================================

const MODEL_NAME = 'gemini-2.0-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent`;

// =============================================================================
// Gemini API call with proxy support
// =============================================================================

async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    throw new Error('No API key found. Set GEMINI_API_KEY in .env.local');
  }

  const url = `${GEMINI_API_URL}?key=${apiKey}`;
  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4096,
    },
  });

  // Use proxy if available (needed in some server environments)
  const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy;
  const fetchOptions: RequestInit & { dispatcher?: ProxyAgent } = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  };

  if (proxyUrl) {
    fetchOptions.dispatcher = new ProxyAgent(proxyUrl);
  }

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorBody.substring(0, 200)}`);
  }

  const data = await response.json();

  // Extract text from Gemini response format
  const candidate = data.candidates?.[0];
  if (!candidate?.content?.parts?.[0]?.text) {
    throw new Error('No text in Gemini response');
  }

  return candidate.content.parts[0].text;
}

// =============================================================================
// System Prompts
// =============================================================================

const SYSTEM_PROMPTS: Record<AnalysisType, string> = {
  risk_assessment: `You are an experienced board advisor and risk management expert. Identify, categorize, and assess risks for board directors. Categorize: financial, operational, compliance, strategic, market. Severity: low, medium, high, critical. Consider Swedish corporate governance (Aktiebolagslagen).`,
  financial_health: `You are an experienced CFO. Analyze financial data for inconsistencies, anomalies, and concerns. Assess liquidity, working capital, and margins.`,
  cashflow_analysis: `You are a treasury specialist. Analyze cashflow for issues, burn rate, runway, and timing mismatches.`,
  meeting_summary: `You are an experienced board secretary. Generate professional meeting summaries with decisions and action items. Follow Swedish board protocol when applicable.`,
  action_extraction: `You are a project management expert. Extract actionable tasks with owners, deadlines, and priorities.`,
  follow_up_suggestions: `You are a strategic advisor. Suggest follow-up topics and agenda items for future meetings.`,
  compliance_check: `You are a corporate governance expert specializing in Swedish company law (Aktiebolagslagen) and EU regulations (GDPR, eIDAS).`,
  comprehensive: `You are a senior board advisor. Provide comprehensive governance analysis across financial, operational, and compliance dimensions. Consider Swedish governance best practices.`,
};

// =============================================================================
// Handlers
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body: GeminiAnalysisRequest = await request.json();
    const { analysisType = 'comprehensive', financialData, meetingData, context } = body;

    if (!financialData && !meetingData) {
      return NextResponse.json(
        { error: 'Either financialData or meetingData must be provided' },
        { status: 400 }
      );
    }

    // Build prompt
    let prompt = SYSTEM_PROMPTS[analysisType] + '\n\n';

    if (context) {
      prompt += '## Context\n';
      if (context.companyName) prompt += `Company: ${context.companyName}\n`;
      if (context.industry) prompt += `Industry: ${context.industry}\n`;
      if (context.companySize) prompt += `Size: ${context.companySize}\n`;
      if (context.locale) prompt += `Language: ${context.locale === 'sv' ? 'Swedish' : 'English'}\n`;
      prompt += '\n';
    }

    if (financialData?.length) {
      prompt += '## Financial Data\n\n| Period | Revenue | Expenses | Net Income | Cash |\n|--------|---------|----------|------------|------|\n';
      for (const p of financialData) {
        prompt += `| ${p.period} | ${p.revenue.toLocaleString()} | ${p.expenses.toLocaleString()} | ${p.netIncome.toLocaleString()} | ${p.cashBalance.toLocaleString()} |\n`;
      }
      prompt += '\n';
    }

    if (meetingData) {
      const meeting = meetingData.meeting as Record<string, unknown>;
      if (meeting.title) prompt += `## Meeting: ${meeting.title}\n\n`;
      if (meetingData.notes) prompt += `### Notes\n${meetingData.notes}\n\n`;
      if (meetingData.transcript) {
        const truncated = meetingData.transcript.length > 5000
          ? meetingData.transcript.slice(0, 5000) + '...(truncated)'
          : meetingData.transcript;
        prompt += `### Transcript\n${truncated}\n\n`;
      }
    }

    if (context?.customPrompt) {
      prompt += `\n## Additional Instructions\n${context.customPrompt}\n`;
    }

    prompt += `\nRespond with a JSON object only (no markdown code fences). Analysis type: ${analysisType}.`;

    const responseText = await callGemini(prompt);

    // Parse the response
    let analysis: Record<string, unknown>;
    try {
      let jsonStr = responseText;
      const jsonMatch = jsonStr.match(/```json?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) jsonStr = jsonMatch[1];
      analysis = JSON.parse(jsonStr);
    } catch {
      analysis = {
        executiveSummary: responseText.slice(0, 1000),
        recommendations: ['Analysis completed but JSON parsing failed.'],
      };
    }

    return NextResponse.json({
      analysisType,
      generatedAt: new Date().toISOString(),
      model: MODEL_NAME,
      provider: 'gemini',
      ...analysis,
    });
  } catch (error) {
    console.error('Gemini analysis error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('API key') || errorMessage.includes('No API key')) {
      return NextResponse.json(
        {
          error: 'Gemini API not configured',
          details: errorMessage,
          setup: {
            step1: 'Get an API key from https://aistudio.google.com/apikey',
            step2: 'Add GEMINI_API_KEY=your-key to .env.local',
            step3: 'Restart the development server',
          },
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: `Gemini analysis failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}

export async function GET() {
  const hasKey = !!(process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY);

  return NextResponse.json({
    name: 'Gemini AI Analysis API',
    version: '1.0.0',
    description: 'AI analysis powered by Google Gemini',
    model: MODEL_NAME,
    provider: 'gemini',
    configured: hasKey,
    endpoints: {
      POST: {
        description: 'Run AI analysis using Gemini',
        body: {
          analysisType: 'risk_assessment | financial_health | cashflow_analysis | meeting_summary | action_extraction | follow_up_suggestions | compliance_check | comprehensive',
          financialData: 'Array of financial period data (optional)',
          meetingData: 'Meeting information with notes (optional)',
          context: 'Company context and preferences (optional)',
        },
      },
    },
  });
}
