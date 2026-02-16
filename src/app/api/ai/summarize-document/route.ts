/**
 * Document Summarization API Route
 *
 * Uses Anthropic Claude to generate concise summaries of board documents.
 * Supports multiple languages (Swedish/English) and configurable summary length.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { verifySession, authErrorResponse, AuthError } from '@/lib/auth/verify-session';
import { checkRateLimit, RateLimits } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

interface SummarizeDocumentRequest {
  documentId: string;
  documentName: string;
  documentContent: string;
  documentCategory?: string;
  maxLength?: number; // words
  language: 'sv' | 'en';
  focusAreas?: string[];
}

interface DocumentSummary {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  decisions: string[];
  language: string;
}

export async function POST(request: NextRequest) {
  try {
    // Verify session
    const session = await verifySession(request);

    // Rate limiting
    const rateLimitResult = checkRateLimit(session.user.uid, RateLimits.ai);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before trying again.' },
        { status: 429 }
      );
    }

    const body: SummarizeDocumentRequest = await request.json();
    const {
      documentId,
      documentName,
      documentContent,
      documentCategory,
      maxLength = 300,
      language = 'en',
      focusAreas,
    } = body;

    if (!documentContent) {
      return NextResponse.json(
        { error: 'documentContent is required' },
        { status: 400 }
      );
    }

    // Truncate very long documents for the AI context
    const truncatedContent = documentContent.length > 50000
      ? documentContent.substring(0, 50000) + '\n\n[Document truncated due to length...]'
      : documentContent;

    const languageInstruction = language === 'sv'
      ? 'Respond entirely in Swedish (Svenska).'
      : 'Respond in English.';

    const focusInstruction = focusAreas && focusAreas.length > 0
      ? `Pay special attention to these areas: ${focusAreas.join(', ')}.`
      : '';

    const categoryContext = documentCategory
      ? `This is a ${documentCategory.replace('_', ' ')} document.`
      : '';

    const prompt = `You are a board governance expert summarizing documents for board members.

${languageInstruction}
${categoryContext}
${focusInstruction}

Summarize the following document concisely (approximately ${maxLength} words for the summary).

Document: "${documentName}"

Content:
${truncatedContent}

Provide your response as a JSON object with this structure:
{
  "summary": "A concise executive summary of the document",
  "keyPoints": ["Key point 1", "Key point 2", ...],
  "actionItems": ["Action items mentioned or implied in the document"],
  "decisions": ["Any decisions referenced or required"]
}

Focus on information relevant to board members. Highlight governance implications, financial impact, and compliance considerations. Return valid JSON only.`;

    const result = await generateText({
      model: anthropic('claude-3-5-sonnet-20241022'),
      prompt,
    });

    // Parse the AI response
    let parsed: DocumentSummary;

    try {
      // Extract JSON from the response (handle potential markdown wrapping)
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      parsed = JSON.parse(jsonMatch[0]);
      parsed.language = language;
    } catch {
      // Fallback: use the raw text as summary
      parsed = {
        summary: result.text,
        keyPoints: [],
        actionItems: [],
        decisions: [],
        language,
      };
    }

    logger.info('Document summarized', {
      metadata: {
        documentId,
        documentName,
        language,
        summaryLength: parsed.summary.length,
        keyPointsCount: parsed.keyPoints.length,
      },
    });

    return NextResponse.json({
      success: true,
      documentId,
      ...parsed,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return authErrorResponse(error);
    }

    logger.error('Document summarization failed', error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to summarize document' },
      { status: 500 }
    );
  }
}
