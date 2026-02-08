/**
 * Comprehensive AI Analysis API Route
 *
 * Provides multi-dimensional analysis capabilities for board governance:
 * - Risk identification and assessment
 * - Financial inconsistency detection
 * - Cashflow issue identification
 * - Meeting summaries with action points
 * - Follow-up suggestions
 * - Compliance gap detection
 *
 * Uses Anthropic Claude for intelligent analysis.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import type { Meeting } from '@/types/schema';

// =============================================================================
// Request/Response Types
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

interface FinancialData {
  revenue: number;
  expenses: number;
  netIncome: number;
  cashBalance: number;
  accountsReceivable: number;
  accountsPayable: number;
  burnRate?: number;
  runway?: number;
  grossMargin?: number;
  operatingMargin?: number;
  currentRatio?: number;
  quickRatio?: number;
  debtToEquity?: number;
  period: string;
}

interface MeetingData {
  meeting: Partial<Meeting>;
  notes?: string;
  transcript?: string;
  previousMeetings?: Partial<Meeting>[];
}

interface AnalysisRequest {
  analysisType: AnalysisType;
  financialData?: FinancialData[];
  meetingData?: MeetingData;
  context?: {
    companyName?: string;
    industry?: string;
    companySize?: 'startup' | 'sme' | 'enterprise';
    locale?: 'en' | 'sv';
    previousAnalyses?: string[];
    customPrompt?: string;
  };
}

interface RiskItem {
  category: 'financial' | 'operational' | 'compliance' | 'strategic' | 'market';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  mitigation: string;
  deadline?: string;
}

interface FinancialInsight {
  type: 'positive' | 'warning' | 'critical';
  metric: string;
  value: string;
  trend: 'improving' | 'stable' | 'declining';
  insight: string;
  recommendation?: string;
}

interface CashflowIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  issue: string;
  impact: string;
  timeframe: string;
  recommendation: string;
}

interface ExtractedAction {
  title: string;
  description: string;
  owner?: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
  relatedAgendaItem?: string;
}

interface FollowUp {
  topic: string;
  reason: string;
  suggestedDate?: string;
  stakeholders: string[];
  requiredDocuments?: string[];
}

interface ComprehensiveAnalysisResponse {
  analysisType: AnalysisType;
  generatedAt: string;
  model: string;

  // Risk Assessment
  risks?: RiskItem[];
  riskSummary?: string;
  overallRiskLevel?: 'low' | 'medium' | 'high' | 'critical';

  // Financial Health
  financialInsights?: FinancialInsight[];
  financialSummary?: string;
  healthScore?: number;

  // Cashflow
  cashflowIssues?: CashflowIssue[];
  cashflowSummary?: string;
  projectedRunway?: string;

  // Meeting Analysis
  meetingSummary?: string;
  keyDecisions?: string[];
  actionItems?: ExtractedAction[];
  unaddressedTopics?: string[];

  // Follow-ups
  followUps?: FollowUp[];

  // Compliance
  complianceGaps?: {
    area: string;
    gap: string;
    regulation: string;
    urgency: 'low' | 'medium' | 'high';
    recommendation: string;
  }[];

  // General
  executiveSummary?: string;
  recommendations?: string[];
}

// =============================================================================
// Analysis Prompts
// =============================================================================

const SYSTEM_PROMPTS: Record<AnalysisType, string> = {
  risk_assessment: `You are an experienced board advisor and risk management expert. Your role is to identify, categorize, and assess risks that boards of directors need to be aware of.

Guidelines:
- Categorize risks into: financial, operational, compliance, strategic, market
- Assign severity levels: low, medium, high, critical
- Provide actionable mitigation strategies
- Consider Swedish corporate governance requirements (Aktiebolagslagen)
- Be specific and avoid vague generalizations
- Focus on risks that require board-level attention`,

  financial_health: `You are an experienced CFO and financial analyst. Analyze financial data to identify inconsistencies, anomalies, and areas requiring attention.

Guidelines:
- Look for unusual patterns or deviations from normal business operations
- Identify margin compression, revenue concentration, or expense anomalies
- Assess liquidity position and working capital efficiency
- Compare ratios against typical benchmarks
- Flag any data that seems inconsistent or requires verification
- Provide specific, actionable insights`,

  cashflow_analysis: `You are a treasury and cash management specialist. Analyze cashflow data to identify potential issues and recommend improvements.

Guidelines:
- Assess cash burn rate and runway
- Identify timing mismatches between inflows and outflows
- Look for seasonal patterns that could cause stress
- Evaluate working capital optimization opportunities
- Provide early warning indicators
- Recommend specific actions with timeframes`,

  meeting_summary: `You are an experienced board secretary. Generate professional meeting summaries that capture key decisions, discussions, and action items.

Guidelines:
- Structure summaries clearly with sections
- Capture the essence of discussions without verbatim transcription
- Highlight all decisions with their outcomes
- Extract clear action items with owners and deadlines
- Note any items deferred or requiring follow-up
- Use formal but accessible language
- Follow Swedish board protocol standards when applicable`,

  action_extraction: `You are a project management expert. Extract clear, actionable tasks from meeting content and notes.

Guidelines:
- Each action should have a clear deliverable
- Identify the most appropriate owner based on context
- Suggest realistic deadlines based on urgency and complexity
- Categorize actions (strategic, operational, compliance, etc.)
- Assign priorities based on business impact
- Link actions to their originating agenda items`,

  follow_up_suggestions: `You are a strategic advisor helping boards maintain momentum between meetings. Suggest follow-ups and future agenda items.

Guidelines:
- Identify topics that need board revisitation
- Suggest appropriate timeframes for follow-up
- Identify stakeholders who should be involved
- Note any documents or data needed for follow-up discussions
- Consider regulatory deadlines and reporting requirements
- Balance urgency with board time constraints`,

  compliance_check: `You are a corporate governance and compliance expert specializing in Swedish company law and EU regulations.

Guidelines:
- Check against Aktiebolagslagen (Swedish Companies Act) requirements
- Consider GDPR and data protection compliance
- Assess board composition and committee requirements
- Review decision-making procedures against governance codes
- Identify documentation gaps
- Note upcoming regulatory deadlines`,

  comprehensive: `You are a senior board advisor providing comprehensive governance support. Analyze the provided data across multiple dimensions to give a holistic view of the organization's governance health.

Guidelines:
- Synthesize insights across financial, operational, and compliance dimensions
- Identify interconnected risks and opportunities
- Prioritize findings based on materiality and urgency
- Provide actionable recommendations for the board
- Consider Swedish corporate governance best practices
- Be concise but thorough in the executive summary`,
};

// =============================================================================
// Helper Functions
// =============================================================================

function formatMeetingForPrompt(data: MeetingData): string {
  const { meeting, notes, transcript, previousMeetings } = data;

  let formatted = '';

  if (meeting.title) {
    formatted += `## Meeting: ${meeting.title}\n`;
    formatted += `Type: ${meeting.meetingType || 'Board Meeting'}\n`;
    formatted += `Status: ${meeting.status || 'completed'}\n\n`;
  }

  if (meeting.attendees && meeting.attendees.length > 0) {
    formatted += `### Attendees\n`;
    meeting.attendees.forEach((a) => {
      formatted += `- ${a.displayName} (${a.role})\n`;
    });
    formatted += '\n';
  }

  if (meeting.agendaItems && meeting.agendaItems.length > 0) {
    formatted += `### Agenda Items\n`;
    meeting.agendaItems.forEach((item, idx) => {
      formatted += `${idx + 1}. **${item.title}** [${item.type}]\n`;
      if (item.description) formatted += `   ${item.description}\n`;
      if (item.discussionNotes) formatted += `   Notes: ${item.discussionNotes}\n`;
      if (item.decision?.outcome) {
        formatted += `   Decision: ${item.decision.outcome}`;
        if (item.decision.motion) formatted += ` - "${item.decision.motion}"`;
        formatted += '\n';
      }
      formatted += '\n';
    });
  }

  if (notes) {
    formatted += `### Additional Notes\n${notes}\n\n`;
  }

  if (transcript) {
    formatted += `### Meeting Transcript\n${transcript.slice(0, 5000)}${transcript.length > 5000 ? '...(truncated)' : ''}\n\n`;
  }

  if (previousMeetings && previousMeetings.length > 0) {
    formatted += `### Previous Meeting Context\n`;
    previousMeetings.slice(0, 3).forEach((pm) => {
      formatted += `- ${pm.title} (${pm.status})\n`;
    });
    formatted += '\n';
  }

  return formatted;
}

function formatFinancialDataForPrompt(data: FinancialData[]): string {
  if (!data || data.length === 0) return 'No financial data provided.';

  let formatted = '## Financial Data\n\n';

  // Create a markdown table
  formatted += '| Period | Revenue | Expenses | Net Income | Cash | AR | AP | Gross Margin | Current Ratio |\n';
  formatted += '|--------|---------|----------|------------|------|----|----|--------------|---------------|\n';

  data.forEach((period) => {
    formatted += `| ${period.period} | ${period.revenue.toLocaleString()} | ${period.expenses.toLocaleString()} | ${period.netIncome.toLocaleString()} | ${period.cashBalance.toLocaleString()} | ${period.accountsReceivable.toLocaleString()} | ${period.accountsPayable.toLocaleString()} | ${period.grossMargin ? (period.grossMargin * 100).toFixed(1) + '%' : 'N/A'} | ${period.currentRatio?.toFixed(2) || 'N/A'} |\n`;
  });

  // Calculate trends if multiple periods
  if (data.length >= 2) {
    const latest = data[data.length - 1]!;
    const previous = data[data.length - 2]!;

    formatted += '\n### Period-over-Period Changes\n';
    formatted += `- Revenue: ${(((latest.revenue - previous.revenue) / previous.revenue) * 100).toFixed(1)}%\n`;
    formatted += `- Net Income: ${previous.netIncome !== 0 ? (((latest.netIncome - previous.netIncome) / Math.abs(previous.netIncome)) * 100).toFixed(1) + '%' : 'N/A'}\n`;
    formatted += `- Cash Position: ${(latest.cashBalance - previous.cashBalance).toLocaleString()} change\n`;

    // Calculate burn rate if declining cash
    if (latest.cashBalance < previous.cashBalance) {
      const monthlyBurn = previous.cashBalance - latest.cashBalance;
      const runway = Math.floor(latest.cashBalance / monthlyBurn);
      formatted += `- Estimated Burn Rate: ${monthlyBurn.toLocaleString()} per period\n`;
      formatted += `- Estimated Runway: ${runway} periods at current burn rate\n`;
    }
  }

  return formatted;
}

function buildUserPrompt(request: AnalysisRequest): string {
  const { analysisType, financialData, meetingData, context } = request;

  let prompt = '';

  // Add context
  if (context) {
    prompt += '## Context\n';
    if (context.companyName) prompt += `Company: ${context.companyName}\n`;
    if (context.industry) prompt += `Industry: ${context.industry}\n`;
    if (context.companySize) prompt += `Company Size: ${context.companySize}\n`;
    if (context.locale) prompt += `Locale: ${context.locale === 'sv' ? 'Swedish' : 'English'}\n`;
    prompt += '\n';
  }

  // Add data based on analysis type
  if (meetingData) {
    prompt += formatMeetingForPrompt(meetingData);
  }

  if (financialData && financialData.length > 0) {
    prompt += formatFinancialDataForPrompt(financialData);
  }

  // Add custom prompt if provided
  if (context?.customPrompt) {
    prompt += `\n## Additional Instructions\n${context.customPrompt}\n`;
  }

  // Request specific output format
  prompt += `\n## Requested Analysis: ${analysisType.toUpperCase().replace('_', ' ')}\n\n`;
  prompt += getOutputFormatInstructions(analysisType);

  return prompt;
}

function getOutputFormatInstructions(analysisType: AnalysisType): string {
  const baseInstruction = 'Please respond with a JSON object in the following format:\n\n';

  switch (analysisType) {
    case 'risk_assessment':
      return baseInstruction + `{
  "overallRiskLevel": "low|medium|high|critical",
  "riskSummary": "Brief executive summary of risk posture",
  "risks": [
    {
      "category": "financial|operational|compliance|strategic|market",
      "severity": "low|medium|high|critical",
      "title": "Risk title",
      "description": "Detailed description",
      "mitigation": "Recommended mitigation steps",
      "deadline": "Optional deadline for action"
    }
  ],
  "recommendations": ["Top priority recommendations"]
}`;

    case 'financial_health':
      return baseInstruction + `{
  "healthScore": 0-100,
  "financialSummary": "Executive summary of financial health",
  "financialInsights": [
    {
      "type": "positive|warning|critical",
      "metric": "Name of metric",
      "value": "Current value",
      "trend": "improving|stable|declining",
      "insight": "What this means",
      "recommendation": "Optional action item"
    }
  ],
  "recommendations": ["Prioritized list of recommendations"]
}`;

    case 'cashflow_analysis':
      return baseInstruction + `{
  "cashflowSummary": "Executive summary of cashflow position",
  "projectedRunway": "Estimated runway in months/periods",
  "cashflowIssues": [
    {
      "severity": "low|medium|high|critical",
      "issue": "Description of the issue",
      "impact": "Potential business impact",
      "timeframe": "When this becomes critical",
      "recommendation": "Suggested action"
    }
  ],
  "recommendations": ["Prioritized cash management recommendations"]
}`;

    case 'meeting_summary':
      return baseInstruction + `{
  "meetingSummary": "Comprehensive summary (200-300 words)",
  "keyDecisions": ["List of decisions made"],
  "actionItems": [
    {
      "title": "Action title",
      "description": "What needs to be done",
      "owner": "Suggested owner",
      "dueDate": "Suggested deadline",
      "priority": "low|medium|high",
      "category": "Category",
      "relatedAgendaItem": "Original agenda item"
    }
  ],
  "unaddressedTopics": ["Topics that need follow-up"]
}`;

    case 'action_extraction':
      return baseInstruction + `{
  "actionItems": [
    {
      "title": "Clear action title",
      "description": "Detailed description of deliverable",
      "owner": "Suggested owner based on context",
      "dueDate": "Realistic deadline",
      "priority": "low|medium|high",
      "category": "strategic|operational|compliance|financial|hr",
      "relatedAgendaItem": "Source agenda item"
    }
  ]
}`;

    case 'follow_up_suggestions':
      return baseInstruction + `{
  "followUps": [
    {
      "topic": "Topic requiring follow-up",
      "reason": "Why this needs board attention",
      "suggestedDate": "Recommended timeframe",
      "stakeholders": ["Who should be involved"],
      "requiredDocuments": ["Documents needed"]
    }
  ],
  "recommendations": ["General recommendations for follow-up management"]
}`;

    case 'compliance_check':
      return baseInstruction + `{
  "complianceGaps": [
    {
      "area": "Area of compliance",
      "gap": "Identified gap",
      "regulation": "Relevant regulation",
      "urgency": "low|medium|high",
      "recommendation": "How to address"
    }
  ],
  "recommendations": ["Overall compliance recommendations"]
}`;

    case 'comprehensive':
    default:
      return baseInstruction + `{
  "executiveSummary": "High-level overview (150-200 words)",
  "overallRiskLevel": "low|medium|high|critical",
  "healthScore": 0-100,
  "risks": [Top 3-5 most significant risks],
  "financialInsights": [Top 3-5 financial insights],
  "cashflowIssues": [Any critical cashflow issues],
  "actionItems": [Priority action items from meeting],
  "followUps": [Suggested follow-up items],
  "recommendations": ["Top 5 board recommendations in priority order"]
}`;
  }
}

// =============================================================================
// Main API Handler
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body: AnalysisRequest = await request.json();
    const { analysisType = 'comprehensive' } = body;

    // Validate request
    if (!body.financialData && !body.meetingData) {
      return NextResponse.json(
        { error: 'Either financialData or meetingData must be provided' },
        { status: 400 }
      );
    }

    // Build prompts
    const systemPrompt = SYSTEM_PROMPTS[analysisType] || SYSTEM_PROMPTS.comprehensive;
    const userPrompt = buildUserPrompt(body);

    // Call Claude
    const { text: responseText } = await generateText({
      model: anthropic('claude-3-5-sonnet-20241022'),
      system: systemPrompt,
      prompt: userPrompt,
    });

    // Parse response
    let analysis: Partial<ComprehensiveAnalysisResponse>;
    try {
      // Try to extract JSON from potential markdown code blocks
      let jsonStr = responseText;
      const jsonMatch = jsonStr.match(/```json?\s*([\s\S]*?)\s*```/);
      if (jsonMatch?.[1]) {
        jsonStr = jsonMatch[1];
      }
      analysis = JSON.parse(jsonStr);
    } catch {
      // Fallback if JSON parsing fails
      analysis = {
        executiveSummary: responseText.slice(0, 1000),
        recommendations: ['Analysis completed but structured parsing failed. Review raw output.'],
      };
    }

    // Build response
    const response: ComprehensiveAnalysisResponse = {
      analysisType,
      generatedAt: new Date().toISOString(),
      model: 'claude-3-5-sonnet',
      ...analysis,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Comprehensive analysis error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Check for API key issues
    if (errorMessage.includes('API key') || errorMessage.includes('authentication')) {
      return NextResponse.json(
        {
          error: 'AI service configuration error',
          details: 'The ANTHROPIC_API_KEY environment variable may not be configured correctly.',
          setup: {
            step1: 'Get an API key from https://console.anthropic.com',
            step2: 'Add ANTHROPIC_API_KEY=your-key-here to your .env.local file',
            step3: 'Restart your development server',
          },
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: `Analysis failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// =============================================================================
// GET endpoint for documentation
// =============================================================================

export async function GET() {
  return NextResponse.json({
    name: 'Comprehensive AI Analysis API',
    version: '1.0.0',
    description: 'Multi-dimensional AI analysis for board governance',
    endpoints: {
      POST: {
        description: 'Run AI analysis on provided data',
        body: {
          analysisType: {
            type: 'string',
            enum: [
              'risk_assessment',
              'financial_health',
              'cashflow_analysis',
              'meeting_summary',
              'action_extraction',
              'follow_up_suggestions',
              'compliance_check',
              'comprehensive',
            ],
            default: 'comprehensive',
          },
          financialData: {
            type: 'array',
            description: 'Array of financial period data',
            optional: true,
          },
          meetingData: {
            type: 'object',
            description: 'Meeting information including agenda and notes',
            optional: true,
          },
          context: {
            type: 'object',
            description: 'Additional context like company name, industry',
            optional: true,
          },
        },
      },
    },
    analysisTypes: {
      risk_assessment: 'Identify and categorize risks requiring board attention',
      financial_health: 'Analyze financial data for inconsistencies and concerns',
      cashflow_analysis: 'Detect cashflow issues and runway concerns',
      meeting_summary: 'Generate professional meeting summaries',
      action_extraction: 'Extract action items from meeting content',
      follow_up_suggestions: 'Suggest follow-up topics and agenda items',
      compliance_check: 'Check against Swedish corporate governance requirements',
      comprehensive: 'Full multi-dimensional analysis',
    },
    setup: {
      required: 'ANTHROPIC_API_KEY environment variable',
      getKey: 'https://console.anthropic.com',
    },
  });
}
