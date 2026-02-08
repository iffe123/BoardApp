/**
 * Firebase AI Logic Service for GovernanceOS
 *
 * Client-side AI service using Firebase AI Logic with Gemini models.
 * This runs through the Firebase project's Gemini Developer API,
 * authenticated via Firebase — no separate API key required.
 *
 * SETUP:
 * 1. Enable the Gemini Developer API in Firebase Console → AI Logic
 * 2. Enable AI monitoring (optional but recommended)
 * 3. Ensure your Firebase config is set in environment variables
 *
 * This service complements the existing Anthropic Claude integration
 * by providing an additional AI provider that works client-side.
 */

import { getGenerativeModel } from 'firebase/ai';
import type { GenerativeModel } from 'firebase/ai';
import { firebaseAI } from '@/lib/firebase';
import type {
  AIAnalysisResult,
  AIAnalysisType,
  FinancialPeriodInput,
  MeetingInput,
  AIAnalysisOptions,
} from '@/lib/ai-service';

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_MODEL = 'gemini-2.5-flash-preview-05-20';

// =============================================================================
// Gemini Model Initialization
// =============================================================================

let _model: GenerativeModel | null = null;

function getModel(): GenerativeModel {
  if (!_model) {
    _model = getGenerativeModel(firebaseAI, { model: DEFAULT_MODEL });
  }
  return _model;
}

// =============================================================================
// System Prompts (shared structure with Anthropic routes)
// =============================================================================

const SYSTEM_PROMPTS: Record<AIAnalysisType, string> = {
  risk_assessment: `You are an experienced board advisor and risk management expert. Identify, categorize, and assess risks that boards of directors need to be aware of.
Categorize risks into: financial, operational, compliance, strategic, market.
Assign severity levels: low, medium, high, critical.
Provide actionable mitigation strategies.
Consider Swedish corporate governance requirements (Aktiebolagslagen).`,

  financial_health: `You are an experienced CFO and financial analyst. Analyze financial data to identify inconsistencies, anomalies, and areas requiring attention.
Look for unusual patterns, margin compression, revenue concentration, or expense anomalies.
Assess liquidity position and working capital efficiency.
Provide specific, actionable insights.`,

  cashflow_analysis: `You are a treasury and cash management specialist. Analyze cashflow data to identify potential issues and recommend improvements.
Assess cash burn rate and runway.
Identify timing mismatches between inflows and outflows.
Recommend specific actions with timeframes.`,

  meeting_summary: `You are an experienced board secretary. Generate professional meeting summaries that capture key decisions, discussions, and action items.
Follow Swedish board protocol standards when applicable.
Use formal but accessible language.`,

  action_extraction: `You are a project management expert. Extract clear, actionable tasks from meeting content and notes.
Each action should have a clear deliverable, owner, and deadline.
Categorize and prioritize actions based on business impact.`,

  follow_up_suggestions: `You are a strategic advisor helping boards maintain momentum between meetings.
Suggest topics needing board revisitation with appropriate timeframes.
Consider regulatory deadlines and reporting requirements.`,

  compliance_check: `You are a corporate governance and compliance expert specializing in Swedish company law and EU regulations.
Check against Aktiebolagslagen (Swedish Companies Act) requirements.
Consider GDPR and data protection compliance.
Assess board composition and committee requirements.`,

  comprehensive: `You are a senior board advisor providing comprehensive governance support.
Synthesize insights across financial, operational, and compliance dimensions.
Identify interconnected risks and opportunities.
Consider Swedish corporate governance best practices.`,
};

// =============================================================================
// Formatting Helpers
// =============================================================================

function formatFinancialData(data: FinancialPeriodInput[]): string {
  if (!data || data.length === 0) return '';

  let formatted = '## Financial Data\n\n';
  formatted += '| Period | Revenue | Expenses | Net Income | Cash | AR | AP |\n';
  formatted += '|--------|---------|----------|------------|------|----|----|  \n';

  for (const period of data) {
    formatted += `| ${period.period} | ${period.revenue.toLocaleString()} | ${period.expenses.toLocaleString()} | ${period.netIncome.toLocaleString()} | ${period.cashBalance.toLocaleString()} | ${period.accountsReceivable.toLocaleString()} | ${period.accountsPayable.toLocaleString()} |\n`;
  }

  return formatted;
}

function formatMeetingData(data: MeetingInput): string {
  const { meeting, notes, transcript } = data;
  let formatted = '';

  if (meeting.title) {
    formatted += `## Meeting: ${meeting.title}\n`;
    formatted += `Type: ${meeting.meetingType || 'Board Meeting'}\n\n`;
  }

  if (meeting.attendees?.length) {
    formatted += '### Attendees\n';
    for (const a of meeting.attendees) {
      formatted += `- ${a.displayName} (${a.role})\n`;
    }
    formatted += '\n';
  }

  if (meeting.agendaItems?.length) {
    formatted += '### Agenda Items\n';
    meeting.agendaItems.forEach((item, idx) => {
      formatted += `${idx + 1}. **${item.title}** [${item.type}]\n`;
      if (item.description) formatted += `   ${item.description}\n`;
      if (item.discussionNotes) formatted += `   Notes: ${item.discussionNotes}\n`;
      formatted += '\n';
    });
  }

  if (notes) {
    formatted += `### Additional Notes\n${notes}\n\n`;
  }

  if (transcript) {
    const truncated = transcript.length > 5000
      ? transcript.slice(0, 5000) + '...(truncated)'
      : transcript;
    formatted += `### Transcript\n${truncated}\n\n`;
  }

  return formatted;
}

function getOutputInstructions(analysisType: AIAnalysisType): string {
  const base = 'Respond with a JSON object. No markdown code fences, just raw JSON.\n\n';

  switch (analysisType) {
    case 'risk_assessment':
      return base + `Format: { "overallRiskLevel": "low|medium|high|critical", "riskSummary": "string", "risks": [{ "category": "financial|operational|compliance|strategic|market", "severity": "low|medium|high|critical", "title": "string", "description": "string", "mitigation": "string" }], "recommendations": ["string"] }`;
    case 'financial_health':
      return base + `Format: { "healthScore": number, "financialSummary": "string", "financialInsights": [{ "type": "positive|warning|critical", "metric": "string", "value": "string", "trend": "improving|stable|declining", "insight": "string", "recommendation": "string" }], "recommendations": ["string"] }`;
    case 'cashflow_analysis':
      return base + `Format: { "cashflowSummary": "string", "projectedRunway": "string", "cashflowIssues": [{ "severity": "low|medium|high|critical", "issue": "string", "impact": "string", "timeframe": "string", "recommendation": "string" }], "recommendations": ["string"] }`;
    case 'meeting_summary':
      return base + `Format: { "meetingSummary": "string", "keyDecisions": ["string"], "actionItems": [{ "title": "string", "description": "string", "owner": "string", "dueDate": "string", "priority": "low|medium|high", "category": "string" }], "unaddressedTopics": ["string"] }`;
    case 'action_extraction':
      return base + `Format: { "actionItems": [{ "title": "string", "description": "string", "owner": "string", "dueDate": "string", "priority": "low|medium|high", "category": "string", "relatedAgendaItem": "string" }] }`;
    case 'follow_up_suggestions':
      return base + `Format: { "followUps": [{ "topic": "string", "reason": "string", "suggestedDate": "string", "stakeholders": ["string"], "requiredDocuments": ["string"] }], "recommendations": ["string"] }`;
    case 'compliance_check':
      return base + `Format: { "complianceGaps": [{ "area": "string", "gap": "string", "regulation": "string", "urgency": "low|medium|high", "recommendation": "string" }], "recommendations": ["string"] }`;
    case 'comprehensive':
    default:
      return base + `Format: { "executiveSummary": "string", "overallRiskLevel": "low|medium|high|critical", "healthScore": number, "risks": [top risks], "financialInsights": [top insights], "actionItems": [priority items], "followUps": [suggested follow-ups], "recommendations": ["string"] }`;
  }
}

// =============================================================================
// Firebase AI Service Class
// =============================================================================

export class FirebaseAIService {
  /**
   * Check if Firebase AI Logic is available
   */
  async checkAvailability(): Promise<{ available: boolean; message: string }> {
    try {
      const model = getModel();
      // Quick test to verify the model is accessible
      const result = await model.countTokens('test');
      return {
        available: result.totalTokens > 0,
        message: 'Firebase AI Logic (Gemini) is available',
      };
    } catch (error) {
      return {
        available: false,
        message: error instanceof Error ? error.message : 'Firebase AI Logic is not available',
      };
    }
  }

  /**
   * Run analysis using Gemini via Firebase AI Logic
   */
  async analyze(
    analysisType: AIAnalysisType,
    financialData?: FinancialPeriodInput[],
    meetingData?: MeetingInput,
    options?: AIAnalysisOptions
  ): Promise<AIAnalysisResult> {
    try {
      const model = getModel();

      // Build the prompt
      let prompt = '';

      // System context
      prompt += SYSTEM_PROMPTS[analysisType] + '\n\n';

      // Add context
      if (options) {
        prompt += '## Context\n';
        if (options.companyName) prompt += `Company: ${options.companyName}\n`;
        if (options.industry) prompt += `Industry: ${options.industry}\n`;
        if (options.companySize) prompt += `Size: ${options.companySize}\n`;
        if (options.locale) prompt += `Language: ${options.locale === 'sv' ? 'Swedish' : 'English'}\n`;
        prompt += '\n';
      }

      // Add data
      if (financialData?.length) {
        prompt += formatFinancialData(financialData);
      }

      if (meetingData) {
        prompt += formatMeetingData(meetingData);
      }

      // Add custom prompt
      if (options?.customPrompt) {
        prompt += `\n## Additional Instructions\n${options.customPrompt}\n`;
      }

      // Output format
      prompt += `\n## Requested Analysis: ${analysisType.replace(/_/g, ' ').toUpperCase()}\n\n`;
      prompt += getOutputInstructions(analysisType);

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      // Parse JSON from the response
      let analysis: Partial<AIAnalysisResult>;
      try {
        let jsonStr = responseText;
        // Strip potential markdown code fences
        const jsonMatch = jsonStr.match(/```json?\s*([\s\S]*?)\s*```/);
        if (jsonMatch?.[1]) {
          jsonStr = jsonMatch[1];
        }
        analysis = JSON.parse(jsonStr);
      } catch {
        analysis = {
          executiveSummary: responseText.slice(0, 1000),
          recommendations: ['Analysis completed but structured parsing failed. Review raw output.'],
        };
      }

      return {
        analysisType,
        generatedAt: new Date().toISOString(),
        model: `gemini (${DEFAULT_MODEL})`,
        ...analysis,
      };
    } catch (error) {
      console.error(`Firebase AI ${analysisType} error:`, error);
      return {
        analysisType,
        generatedAt: new Date().toISOString(),
        model: 'error',
        error: error instanceof Error ? error.message : 'Firebase AI analysis failed',
      };
    }
  }

  /**
   * Generate meeting minutes using Gemini
   */
  async generateMinutes(
    meeting: { title?: string; agendaItems?: Array<{ id: string; title: string; type: string; description?: string; discussionNotes?: string; decision?: { motion?: string; outcome?: string } }>; attendees?: Array<{ displayName: string; role: string; attendanceStatus?: string; response?: string }> },
    notes: string,
    language: 'en' | 'sv' = 'en'
  ): Promise<{
    summary: string;
    minuteItems: Array<{
      agendaItemId: string;
      discussion: string;
      decision?: string;
      actionItems?: Array<{ title: string; owner?: string; dueDate?: string }>;
    }>;
  }> {
    const model = getModel();

    const isSwedish = language === 'sv';

    const prompt = `You are an experienced Board Secretary. Create professional meeting minutes.
${isSwedish ? 'Write in formal Swedish suitable for official board records.' : 'Write in formal English suitable for official board records.'}

## Meeting: ${meeting.title || 'Board Meeting'}

### Attendees
${meeting.attendees?.map(a => `- ${a.displayName} (${a.role})`).join('\n') || 'Not recorded'}

### Agenda Items
${meeting.agendaItems?.map((item, i) => {
  let text = `${i + 1}. [${item.type}] ${item.title}`;
  if (item.description) text += `\n   ${item.description}`;
  if (item.discussionNotes) text += `\n   Notes: ${item.discussionNotes}`;
  if (item.decision?.outcome) text += `\n   Decision: ${item.decision.outcome}`;
  return text;
}).join('\n\n') || 'No items'}

### Notes
${notes}

Respond with JSON only (no code fences):
{
  "summary": "Brief meeting summary",
  "minuteItems": [
    {
      "agendaItemId": "item id",
      "discussion": "Discussion summary",
      "decision": "Decision text if applicable",
      "actionItems": [{ "title": "Action", "owner": "Person", "dueDate": "YYYY-MM-DD" }]
    }
  ]
}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    let parsed;
    try {
      let jsonStr = responseText;
      const jsonMatch = jsonStr.match(/```json?\s*([\s\S]*?)\s*```/);
      if (jsonMatch?.[1]) jsonStr = jsonMatch[1];
      parsed = JSON.parse(jsonStr);
    } catch {
      parsed = {
        summary: 'Minutes generation completed but parsing failed.',
        minuteItems: [],
      };
    }

    return parsed;
  }

  /**
   * Summarize a document using Gemini
   */
  async summarizeText(
    text: string,
    options?: { maxLength?: number; language?: 'en' | 'sv' }
  ): Promise<string> {
    const model = getModel();
    const lang = options?.language === 'sv' ? 'Swedish' : 'English';
    const maxLen = options?.maxLength || 500;

    const prompt = `Summarize the following text in ${lang}. Keep the summary under ${maxLen} words. Focus on key points relevant to board governance.\n\n${text}`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let _instance: FirebaseAIService | null = null;

export function getFirebaseAIService(): FirebaseAIService {
  if (!_instance) {
    _instance = new FirebaseAIService();
  }
  return _instance;
}
