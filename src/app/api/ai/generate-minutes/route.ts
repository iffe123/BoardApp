/**
 * Meeting Minutes Generation API Route
 *
 * Uses Anthropic Claude to generate meeting minutes from
 * agenda items, notes, and optionally transcripts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import type { AgendaItem, MeetingAttendee, DecisionOutcome } from '@/types/schema';

interface MinutesRequest {
  meetingTitle: string;
  meetingDate: string;
  meetingLocation: string;
  agendaItems: AgendaItem[];
  attendees: MeetingAttendee[];
  transcript?: string;
  notes?: string;
  locale?: string;
}

interface GeneratedMinuteItem {
  agendaItemId: string;
  title: string;
  type: string;
  discussion: string;
  decision?: {
    motion: string;
    outcome: DecisionOutcome;
  };
  actionItems: Array<{
    title: string;
    assignee?: string;
    dueDate?: string;
  }>;
}

interface MinutesResponse {
  summary: string;
  itemMinutes: GeneratedMinuteItem[];
}

// Format agenda for the prompt
function formatAgendaForPrompt(items: AgendaItem[]): string {
  return items
    .map((item, index) => {
      let itemText = `${index + 1}. [${item.type.toUpperCase()}] ${item.title}`;
      if (item.description) {
        itemText += `\n   Description: ${item.description}`;
      }
      if (item.discussionNotes) {
        itemText += `\n   Notes: ${item.discussionNotes}`;
      }
      if (item.decision) {
        itemText += `\n   Decision: ${item.decision.motion || 'No motion recorded'}`;
        if (item.decision.outcome) {
          itemText += ` (${item.decision.outcome})`;
        }
      }
      return itemText;
    })
    .join('\n\n');
}

// Format attendees for the prompt
function formatAttendeesForPrompt(attendees: MeetingAttendee[]): string {
  const present = attendees
    .filter((a) => a.attendanceStatus === 'present' || a.response === 'accepted')
    .map((a) => `${a.displayName} (${a.role})`)
    .join(', ');

  const absent = attendees
    .filter((a) => a.attendanceStatus === 'absent' || a.response === 'declined')
    .map((a) => a.displayName)
    .join(', ');

  return `Present: ${present || 'Not recorded'}\nAbsent: ${absent || 'None'}`;
}

export async function POST(request: NextRequest) {
  try {
    const body: MinutesRequest = await request.json();
    const {
      meetingTitle,
      meetingDate,
      meetingLocation,
      agendaItems,
      attendees,
      transcript,
      notes,
      locale = 'en',
    } = body;

    if (!agendaItems || agendaItems.length === 0) {
      return NextResponse.json(
        { error: 'No agenda items provided' },
        { status: 400 }
      );
    }

    const formattedAgenda = formatAgendaForPrompt(agendaItems);
    const formattedAttendees = formatAttendeesForPrompt(attendees);

    const isSwedish = locale.startsWith('sv');

    const systemPrompt = `You are an experienced Board Secretary tasked with creating professional meeting minutes. Your minutes should be:
- Accurate and objective
- Concise but comprehensive
- Properly formatted for official records
- Focused on decisions, actions, and key discussion points
- ${isSwedish ? 'Written in formal Swedish suitable for official board records' : 'Written in formal English suitable for official board records'}

For each agenda item, provide:
1. A summary of the discussion (2-3 sentences)
2. Any decisions made (with clear motion language)
3. Action items with assignees if mentioned

Do NOT include speculation or information not present in the provided materials.`;

    let userPrompt = `Generate formal meeting minutes for the following board meeting:

## Meeting Details
Title: ${meetingTitle}
Date: ${meetingDate}
Location: ${meetingLocation}

## Attendance
${formattedAttendees}

## Agenda Items
${formattedAgenda}`;

    if (notes) {
      userPrompt += `\n\n## Additional Notes\n${notes}`;
    }

    if (transcript) {
      // Truncate transcript if too long
      const truncatedTranscript =
        transcript.length > 10000 ? transcript.slice(0, 10000) + '...[truncated]' : transcript;
      userPrompt += `\n\n## Meeting Transcript (for reference)\n${truncatedTranscript}`;
    }

    userPrompt += `\n\nPlease provide the minutes in the following JSON format:
{
  "summary": "A brief 2-3 sentence summary of the meeting's key outcomes",
  "itemMinutes": [
    {
      "agendaItemId": "the id from the agenda item",
      "title": "the agenda item title",
      "type": "information|decision|discussion|formality",
      "discussion": "Summary of the discussion for this item",
      "decision": {
        "motion": "The formal motion text if a decision was made",
        "outcome": "approved|rejected|tabled|withdrawn|pending"
      },
      "actionItems": [
        {
          "title": "Description of the action",
          "assignee": "Name of person responsible (if mentioned)",
          "dueDate": "Due date if mentioned (YYYY-MM-DD format)"
        }
      ]
    }
  ]
}

Include the decision object only for items of type "decision" where a vote occurred.
Respond with only the JSON object, no additional text.`;

    const { text: responseText } = await generateText({
      model: anthropic('claude-3-5-sonnet-20241022'),
      system: systemPrompt,
      prompt: userPrompt,
    });

    // Use the text response directly
    const textContent = { text: responseText };

    // Parse the JSON response
    let minutes: MinutesResponse;
    try {
      let jsonStr = textContent.text;
      // Handle potential markdown code blocks
      const jsonMatch = jsonStr.match(/```json?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }
      minutes = JSON.parse(jsonStr);

      // Ensure all agenda items have corresponding minutes
      const minuteIds = new Set(minutes.itemMinutes.map((m) => m.agendaItemId));
      for (const item of agendaItems) {
        if (!minuteIds.has(item.id)) {
          minutes.itemMinutes.push({
            agendaItemId: item.id,
            title: item.title,
            type: item.type,
            discussion: 'No discussion recorded for this item.',
            actionItems: [],
          });
        }
      }

      // Sort by original agenda order
      const idToIndex = new Map(agendaItems.map((item, idx) => [item.id, idx]));
      minutes.itemMinutes.sort(
        (a, b) => (idToIndex.get(a.agendaItemId) || 0) - (idToIndex.get(b.agendaItemId) || 0)
      );
    } catch {
      // If parsing fails, create a basic structure
      minutes = {
        summary: 'Meeting minutes generated but structured parsing failed. Please review and edit.',
        itemMinutes: agendaItems.map((item) => ({
          agendaItemId: item.id,
          title: item.title,
          type: item.type,
          discussion: item.discussionNotes || 'No discussion recorded.',
          decision: item.decision
            ? {
                motion: item.decision.motion || '',
                outcome: item.decision.outcome || 'pending',
              }
            : undefined,
          actionItems: [],
        })),
      };
    }

    return NextResponse.json({
      ...minutes,
      generatedAt: new Date().toISOString(),
      model: 'claude-3-5-sonnet',
      itemCount: minutes.itemMinutes.length,
    });
  } catch (error) {
    console.error('Minutes generation error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to generate meeting minutes: ${errorMessage}` },
      { status: 500 }
    );
  }
}
