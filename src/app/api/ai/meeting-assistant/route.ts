/**
 * AI Meeting Assistant API Route
 *
 * Provides AI-powered assistance for meetings:
 * - Generate agenda suggestions from topics/description
 * - Summarize discussions and extract action items
 * - Generate talking points for agenda items
 * - Suggest decisions and motions
 * - Analyze meeting patterns and provide insights
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import type { AgendaItem } from '@/types/schema';

// ============================================================================
// TYPES
// ============================================================================

type AssistantAction =
  | 'generate_agenda'
  | 'suggest_topics'
  | 'generate_talking_points'
  | 'summarize_discussion'
  | 'extract_action_items'
  | 'suggest_motion'
  | 'improve_description'
  | 'meeting_insights';

interface AssistantRequest {
  action: AssistantAction;
  context: {
    meetingType?: 'ordinary' | 'extraordinary' | 'annual_general' | 'statutory';
    meetingTitle?: string;
    meetingDescription?: string;
    organizationName?: string;
    industry?: string;
    agendaItems?: AgendaItem[];
    currentItem?: AgendaItem;
    discussionNotes?: string;
    previousMeetings?: Array<{
      title: string;
      date: string;
      decisions: string[];
      actionItems: string[];
    }>;
    locale?: 'en' | 'sv';
  };
  additionalInstructions?: string;
}

// ============================================================================
// PROMPTS
// ============================================================================

const SYSTEM_PROMPTS: Record<AssistantAction, string> = {
  generate_agenda: `You are an expert Board Secretary with deep knowledge of corporate governance and meeting management.
Your task is to generate professional agenda items for board meetings.

Guidelines:
- Follow proper corporate governance structure
- Include standard formalities (opening, quorum, minutes approval, closing)
- Suggest appropriate item types: 'formality', 'information', 'discussion', or 'decision'
- Estimate realistic durations based on item complexity
- For Swedish companies, follow Swedish Companies Act (Aktiebolagslagen) requirements
- Balance between thoroughness and efficiency

Output format: JSON array of agenda items with title, description, type, estimatedDuration, and talkingPoints.`,

  suggest_topics: `You are a strategic advisor helping boards identify important topics for discussion.
Based on the meeting context and organization details, suggest relevant topics that should be addressed.

Consider:
- Current business climate and market conditions
- Regulatory requirements and compliance
- Strategic planning and growth
- Risk management
- Financial oversight
- Stakeholder interests

Output format: JSON array of topic suggestions with title, rationale, urgency level, and suggested item type.`,

  generate_talking_points: `You are assisting a board meeting presenter with talking points.
Generate clear, professional talking points for the given agenda item.

Guidelines:
- Be concise and actionable
- Structure logically (context, key points, implications, recommendations)
- Include relevant questions for board discussion
- Highlight any decisions or actions required

Output format: JSON object with mainPoints, discussionQuestions, and keyTakeaways arrays.`,

  summarize_discussion: `You are a skilled Board Secretary summarizing meeting discussions for official minutes.
Create a professional summary suitable for board meeting minutes.

Guidelines:
- Be objective and factual
- Capture key points of discussion
- Note any dissenting views appropriately
- Identify conclusions reached
- Use formal language appropriate for official records

Output format: JSON object with summary, keyPoints, and conclusions.`,

  extract_action_items: `You are analyzing meeting content to extract action items.
Identify all actionable items mentioned in the discussion.

For each action item:
- Create a clear, specific description
- Identify the responsible party if mentioned
- Note any deadlines discussed
- Assess priority level

Output format: JSON array of action items with title, description, assignee, dueDate, and priority.`,

  suggest_motion: `You are helping draft formal motion language for board decisions.
Create appropriate motion text based on the discussion context.

Guidelines:
- Use formal motion language ("Resolved, that...")
- Be specific and unambiguous
- Include all necessary details for implementation
- Consider legal and compliance implications
- Suggest appropriate voting method if relevant

Output format: JSON object with motionText, rationale, and suggestedVotingMethod.`,

  improve_description: `You are helping improve the clarity and professionalism of agenda item descriptions.
Enhance the given description while preserving its meaning.

Guidelines:
- Improve clarity and readability
- Add relevant context if helpful
- Use professional business language
- Keep it concise but comprehensive

Output format: JSON object with improvedDescription and suggestions.`,

  meeting_insights: `You are a governance analyst providing insights on meeting patterns and effectiveness.
Analyze the provided meeting data and offer actionable recommendations.

Consider:
- Meeting frequency and duration patterns
- Decision-making efficiency
- Action item completion rates
- Topics that frequently appear
- Areas that may need more attention

Output format: JSON object with insights, patterns, recommendations, and metrics.`,
};

// ============================================================================
// HELPERS
// ============================================================================

function buildContextString(context: AssistantRequest['context']): string {
  const parts: string[] = [];

  if (context.organizationName) {
    parts.push(`Organization: ${context.organizationName}`);
  }
  if (context.industry) {
    parts.push(`Industry: ${context.industry}`);
  }
  if (context.meetingType) {
    parts.push(`Meeting Type: ${context.meetingType.replace('_', ' ')}`);
  }
  if (context.meetingTitle) {
    parts.push(`Meeting Title: ${context.meetingTitle}`);
  }
  if (context.meetingDescription) {
    parts.push(`Meeting Description: ${context.meetingDescription}`);
  }
  if (context.locale) {
    parts.push(`Language: ${context.locale === 'sv' ? 'Swedish' : 'English'}`);
  }

  if (context.agendaItems && context.agendaItems.length > 0) {
    parts.push('\nCurrent Agenda Items:');
    context.agendaItems.forEach((item, i) => {
      parts.push(`${i + 1}. [${item.type}] ${item.title} (${item.estimatedDuration} min)`);
      if (item.description) {
        parts.push(`   Description: ${item.description}`);
      }
    });
  }

  if (context.currentItem) {
    parts.push(`\nCurrent Item: ${context.currentItem.title}`);
    if (context.currentItem.description) {
      parts.push(`Description: ${context.currentItem.description}`);
    }
  }

  if (context.discussionNotes) {
    parts.push(`\nDiscussion Notes:\n${context.discussionNotes}`);
  }

  if (context.previousMeetings && context.previousMeetings.length > 0) {
    parts.push('\nPrevious Meetings:');
    context.previousMeetings.forEach(meeting => {
      parts.push(`- ${meeting.title} (${meeting.date})`);
      if (meeting.decisions.length > 0) {
        parts.push(`  Decisions: ${meeting.decisions.join('; ')}`);
      }
    });
  }

  return parts.join('\n');
}

function getModelForAction(action: AssistantAction): string {
  // Use faster model for simpler tasks
  const fastModelActions: AssistantAction[] = ['improve_description', 'extract_action_items'];
  return fastModelActions.includes(action)
    ? 'claude-3-5-haiku-20241022'
    : 'claude-3-5-sonnet-20241022';
}

// ============================================================================
// ROUTE HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body: AssistantRequest = await request.json();
    const { action, context, additionalInstructions } = body;

    if (!action || !SYSTEM_PROMPTS[action]) {
      return NextResponse.json(
        { error: 'Invalid action specified' },
        { status: 400 }
      );
    }

    const systemPrompt = SYSTEM_PROMPTS[action];
    const contextString = buildContextString(context);

    let userPrompt = contextString;
    if (additionalInstructions) {
      userPrompt += `\n\nAdditional Instructions: ${additionalInstructions}`;
    }

    // Add output format reminder
    userPrompt += '\n\nRespond with valid JSON only. Do not include markdown formatting or explanation text.';

    const { text: responseText } = await generateText({
      model: anthropic(getModelForAction(action)),
      system: systemPrompt,
      prompt: userPrompt,
    });

    // Parse JSON response
    let result: unknown;
    try {
      // Handle potential markdown code blocks
      let jsonStr = responseText;
      const jsonMatch = jsonStr.match(/```json?\s*([\s\S]*?)\s*```/);
      if (jsonMatch?.[1]) {
        jsonStr = jsonMatch[1];
      }
      result = JSON.parse(jsonStr);
    } catch {
      // Return raw text if JSON parsing fails
      result = { rawResponse: responseText };
    }

    return NextResponse.json({
      action,
      result,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('AI Meeting Assistant error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `AI assistant error: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// ============================================================================
// STREAMING ENDPOINT FOR LONGER RESPONSES
// ============================================================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') as AssistantAction;

  if (!action || !SYSTEM_PROMPTS[action]) {
    return NextResponse.json(
      { error: 'Invalid action specified' },
      { status: 400 }
    );
  }

  // Return supported actions for documentation
  return NextResponse.json({
    supportedActions: Object.keys(SYSTEM_PROMPTS),
    actionDescriptions: {
      generate_agenda: 'Generate complete agenda items from meeting description',
      suggest_topics: 'Suggest relevant topics for the meeting',
      generate_talking_points: 'Generate talking points for an agenda item',
      summarize_discussion: 'Summarize discussion for minutes',
      extract_action_items: 'Extract action items from discussion',
      suggest_motion: 'Suggest formal motion language for decisions',
      improve_description: 'Improve agenda item description',
      meeting_insights: 'Analyze meeting patterns and provide insights',
    },
  });
}
