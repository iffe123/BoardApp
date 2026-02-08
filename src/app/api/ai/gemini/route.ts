/**
 * Gemini AI Analysis API Route (via Firebase AI Logic)
 *
 * Server-side endpoint for AI analysis using Gemini through Firebase AI Logic.
 * This provides a server-side alternative to the client-side FirebaseAIService,
 * useful when you need to process sensitive data or perform analysis
 * without exposing it to the client.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAI, GoogleAIBackend, getGenerativeModel } from 'firebase/ai';
import { initializeApp, getApps } from 'firebase/app';

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
// Firebase initialization for server-side
// =============================================================================

function getServerModel() {
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  const app = getApps().length === 0
    ? initializeApp(firebaseConfig)
    : getApps()[0];

  const ai = getAI(app, { backend: new GoogleAIBackend() });
  return getGenerativeModel(ai, { model: 'gemini-2.5-flash-preview-05-20' });
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

    const model = getServerModel();

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

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Parse the response
    let analysis: Record<string, unknown>;
    try {
      let jsonStr = responseText;
      const jsonMatch = jsonStr.match(/```json?\s*([\s\S]*?)\s*```/);
      if (jsonMatch?.[1]) jsonStr = jsonMatch[1];
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
      model: 'gemini-2.5-flash-preview-05-20',
      provider: 'firebase-ai',
      ...analysis,
    });
  } catch (error) {
    console.error('Gemini analysis error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('not found') || errorMessage.includes('API_KEY')) {
      return NextResponse.json(
        {
          error: 'Firebase AI Logic not configured',
          details: 'Ensure the Gemini Developer API is enabled in your Firebase project.',
          setup: {
            step1: 'Go to Firebase Console → AI Logic',
            step2: 'Enable the Gemini Developer API',
            step3: 'Ensure your Firebase config environment variables are set',
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
  return NextResponse.json({
    name: 'Gemini AI Analysis API (Firebase AI Logic)',
    version: '1.0.0',
    description: 'AI analysis powered by Gemini via Firebase AI Logic',
    model: 'gemini-2.5-flash-preview-05-20',
    provider: 'firebase-ai',
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
