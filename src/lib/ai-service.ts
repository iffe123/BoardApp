/**
 * AI Service for GovernanceOS
 *
 * Centralized service for all AI-powered features.
 * Uses Anthropic Claude for intelligent analysis and generation.
 *
 * SETUP INSTRUCTIONS:
 * 1. Get an API key from https://console.anthropic.com
 * 2. Add ANTHROPIC_API_KEY=sk-ant-... to your .env.local file
 * 3. Restart your development server
 *
 * The API key is only used server-side and is never exposed to the client.
 */

import type { Meeting } from '@/types/schema';

// =============================================================================
// Types
// =============================================================================

export type AIAnalysisType =
  | 'risk_assessment'
  | 'financial_health'
  | 'cashflow_analysis'
  | 'meeting_summary'
  | 'action_extraction'
  | 'follow_up_suggestions'
  | 'compliance_check'
  | 'comprehensive';

export interface FinancialPeriodInput {
  period: string;
  revenue: number;
  expenses: number;
  netIncome: number;
  cashBalance: number;
  accountsReceivable: number;
  accountsPayable: number;
  burnRate?: number;
  grossMargin?: number;
  operatingMargin?: number;
  currentRatio?: number;
  quickRatio?: number;
  debtToEquity?: number;
}

export interface MeetingInput {
  meeting: Partial<Meeting>;
  notes?: string;
  transcript?: string;
  previousMeetings?: Partial<Meeting>[];
}

export interface AIAnalysisOptions {
  companyName?: string;
  industry?: string;
  companySize?: 'startup' | 'sme' | 'enterprise';
  locale?: 'en' | 'sv';
  customPrompt?: string;
}

export interface RiskItem {
  category: 'financial' | 'operational' | 'compliance' | 'strategic' | 'market';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  mitigation: string;
  deadline?: string;
}

export interface FinancialInsight {
  type: 'positive' | 'warning' | 'critical';
  metric: string;
  value: string;
  trend: 'improving' | 'stable' | 'declining';
  insight: string;
  recommendation?: string;
}

export interface CashflowIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  issue: string;
  impact: string;
  timeframe: string;
  recommendation: string;
}

export interface ExtractedAction {
  title: string;
  description: string;
  owner?: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
  relatedAgendaItem?: string;
}

export interface FollowUp {
  topic: string;
  reason: string;
  suggestedDate?: string;
  stakeholders: string[];
  requiredDocuments?: string[];
}

export interface AIAnalysisResult {
  analysisType: AIAnalysisType;
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

  // Error handling
  error?: string;
}

// =============================================================================
// AI Service Class
// =============================================================================

export class AIService {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  /**
   * Check if AI features are available (API key configured)
   */
  async checkAvailability(): Promise<{
    available: boolean;
    message: string;
    setupInstructions?: string[];
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ai/comprehensive-analysis`, {
        method: 'GET',
      });

      if (response.ok) {
        return {
          available: true,
          message: 'AI features are available',
        };
      }

      return {
        available: false,
        message: 'AI service is not configured',
        setupInstructions: [
          'Get an API key from https://console.anthropic.com',
          'Add ANTHROPIC_API_KEY=sk-ant-... to your .env.local file',
          'Restart your development server',
        ],
      };
    } catch {
      return {
        available: false,
        message: 'Unable to connect to AI service',
        setupInstructions: [
          'Ensure the development server is running',
          'Check your .env.local configuration',
        ],
      };
    }
  }

  /**
   * Run comprehensive analysis on financial and meeting data
   */
  async analyzeComprehensive(
    financialData?: FinancialPeriodInput[],
    meetingData?: MeetingInput,
    options?: AIAnalysisOptions
  ): Promise<AIAnalysisResult> {
    return this.runAnalysis('comprehensive', financialData, meetingData, options);
  }

  /**
   * Run risk assessment analysis
   */
  async analyzeRisks(
    financialData?: FinancialPeriodInput[],
    meetingData?: MeetingInput,
    options?: AIAnalysisOptions
  ): Promise<AIAnalysisResult> {
    return this.runAnalysis('risk_assessment', financialData, meetingData, options);
  }

  /**
   * Analyze financial health and detect inconsistencies
   */
  async analyzeFinancialHealth(
    financialData: FinancialPeriodInput[],
    options?: AIAnalysisOptions
  ): Promise<AIAnalysisResult> {
    return this.runAnalysis('financial_health', financialData, undefined, options);
  }

  /**
   * Analyze cashflow and detect issues
   */
  async analyzeCashflow(
    financialData: FinancialPeriodInput[],
    options?: AIAnalysisOptions
  ): Promise<AIAnalysisResult> {
    return this.runAnalysis('cashflow_analysis', financialData, undefined, options);
  }

  /**
   * Generate meeting summary with key decisions and action items
   */
  async summarizeMeeting(
    meetingData: MeetingInput,
    options?: AIAnalysisOptions
  ): Promise<AIAnalysisResult> {
    return this.runAnalysis('meeting_summary', undefined, meetingData, options);
  }

  /**
   * Extract action items from meeting content
   */
  async extractActions(
    meetingData: MeetingInput,
    options?: AIAnalysisOptions
  ): Promise<AIAnalysisResult> {
    return this.runAnalysis('action_extraction', undefined, meetingData, options);
  }

  /**
   * Suggest follow-up topics and agenda items
   */
  async suggestFollowUps(
    meetingData: MeetingInput,
    options?: AIAnalysisOptions
  ): Promise<AIAnalysisResult> {
    return this.runAnalysis('follow_up_suggestions', undefined, meetingData, options);
  }

  /**
   * Check compliance with Swedish corporate governance
   */
  async checkCompliance(
    meetingData: MeetingInput,
    options?: AIAnalysisOptions
  ): Promise<AIAnalysisResult> {
    return this.runAnalysis('compliance_check', undefined, meetingData, options);
  }

  /**
   * Generate meeting minutes from notes and transcript
   */
  async generateMinutes(
    meeting: Partial<Meeting>,
    notes: string,
    language: 'en' | 'sv' = 'en'
  ): Promise<{
    summary: string;
    minuteItems: Array<{
      agendaItemId: string;
      discussion: string;
      decision?: string;
      actionItems?: ExtractedAction[];
    }>;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ai/generate-minutes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId: meeting.id,
          agendaItems: meeting.agendaItems,
          attendees: meeting.attendees,
          notes,
          language,
        }),
      });

      if (!response.ok) {
        throw new Error(`Minutes generation failed: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Generate minutes error:', error);
      throw error;
    }
  }

  /**
   * Use AI meeting assistant for various tasks
   */
  async meetingAssistant(
    action:
      | 'generate_agenda'
      | 'suggest_topics'
      | 'generate_talking_points'
      | 'summarize_discussion'
      | 'extract_action_items'
      | 'suggest_motion'
      | 'improve_description'
      | 'meeting_insights',
    meetingType: string,
    description: string,
    additionalContext?: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ai/meeting-assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          meetingType,
          description,
          ...additionalContext,
        }),
      });

      if (!response.ok) {
        throw new Error(`Meeting assistant failed: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Meeting assistant error:', error);
      throw error;
    }
  }

  /**
   * Internal method to run analysis
   */
  private async runAnalysis(
    analysisType: AIAnalysisType,
    financialData?: FinancialPeriodInput[],
    meetingData?: MeetingInput,
    options?: AIAnalysisOptions
  ): Promise<AIAnalysisResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ai/comprehensive-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisType,
          financialData,
          meetingData,
          context: options,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Analysis failed: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error(`${analysisType} analysis error:`, error);
      return {
        analysisType,
        generatedAt: new Date().toISOString(),
        model: 'error',
        error: error instanceof Error ? error.message : 'Analysis failed',
      };
    }
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let aiServiceInstance: AIService | null = null;

export function getAIService(): AIService {
  if (!aiServiceInstance) {
    aiServiceInstance = new AIService();
  }
  return aiServiceInstance;
}

// =============================================================================
// AI Feature Capabilities
// =============================================================================

export const AI_CAPABILITIES = {
  risk_assessment: {
    name: 'Risk Assessment',
    description: 'Identify and categorize risks requiring board attention',
    icon: 'Shield',
    requiredData: ['financial', 'meeting'],
  },
  financial_health: {
    name: 'Financial Health Analysis',
    description: 'Detect inconsistencies, anomalies, and financial concerns',
    icon: 'TrendingUp',
    requiredData: ['financial'],
  },
  cashflow_analysis: {
    name: 'Cashflow Analysis',
    description: 'Identify cashflow issues, burn rate, and runway projections',
    icon: 'DollarSign',
    requiredData: ['financial'],
  },
  meeting_summary: {
    name: 'Meeting Summaries',
    description: 'Generate professional summaries with decisions and actions',
    icon: 'FileText',
    requiredData: ['meeting'],
  },
  action_extraction: {
    name: 'Action Item Extraction',
    description: 'Extract actionable tasks with owners and deadlines',
    icon: 'CheckSquare',
    requiredData: ['meeting'],
  },
  follow_up_suggestions: {
    name: 'Follow-up Suggestions',
    description: 'Suggest topics for future board meetings',
    icon: 'Calendar',
    requiredData: ['meeting'],
  },
  compliance_check: {
    name: 'Compliance Check',
    description: 'Check against Swedish corporate governance requirements',
    icon: 'Scale',
    requiredData: ['meeting'],
  },
  minutes_generation: {
    name: 'Minutes Generation',
    description: 'Generate formal meeting minutes from notes',
    icon: 'Edit',
    requiredData: ['meeting'],
  },
} as const;

// =============================================================================
// Setup Instructions
// =============================================================================

export const AI_SETUP_INSTRUCTIONS = {
  title: 'Setting Up AI Features',
  description: `GovernanceOS uses Anthropic Claude for AI-powered features. Follow these steps to enable AI capabilities:`,
  steps: [
    {
      title: 'Get an API Key',
      description: 'Sign up at Anthropic and get an API key from the console.',
      url: 'https://console.anthropic.com',
      action: 'Visit Console',
    },
    {
      title: 'Configure Environment',
      description: 'Add your API key to the .env.local file in your project root:',
      code: 'ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxx',
    },
    {
      title: 'Restart Server',
      description: 'Restart your development server for changes to take effect.',
      code: 'npm run dev',
    },
  ],
  pricing: {
    note: 'Anthropic charges based on usage. Check current pricing at:',
    url: 'https://www.anthropic.com/pricing',
  },
  security: [
    'API keys are only used server-side and never exposed to the client',
    'All AI requests are made through your backend API routes',
    'No data is stored by Anthropic beyond the request/response',
  ],
};
