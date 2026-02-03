'use client';

/**
 * AI Meeting Assistant Component
 *
 * Provides AI-powered assistance for meeting preparation:
 * - Generate agenda suggestions
 * - Generate talking points
 * - Suggest motions for decisions
 * - Extract action items from discussions
 */

import React, { useState } from 'react';
import {
  Sparkles,
  Loader2,
  FileText,
  MessageSquare,
  ListTodo,
  Gavel,
  Wand2,
  ChevronDown,
  Copy,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { AgendaItem, AgendaItemType } from '@/types/schema';

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
  | 'improve_description';

interface AIAssistantProps {
  meetingType?: 'ordinary' | 'extraordinary' | 'annual_general' | 'statutory';
  meetingTitle?: string;
  meetingDescription?: string;
  organizationName?: string;
  industry?: string;
  agendaItems?: AgendaItem[];
  currentItem?: AgendaItem;
  onAgendaSuggestion?: (items: GeneratedAgendaItem[]) => void;
  locale?: 'en' | 'sv';
  className?: string;
}

interface GeneratedAgendaItem {
  title: string;
  description: string;
  type: AgendaItemType;
  estimatedDuration: number;
  talkingPoints?: string[];
}

interface TalkingPoints {
  mainPoints: string[];
  discussionQuestions: string[];
  keyTakeaways: string[];
}

interface ActionItemSuggestion {
  title: string;
  description?: string;
  assignee?: string;
  dueDate?: string;
  priority: 'high' | 'medium' | 'low';
}

interface MotionSuggestion {
  motionText: string;
  rationale: string;
  suggestedVotingMethod: string;
}

// ============================================================================
// API CALL
// ============================================================================

async function callAIAssistant(
  action: AssistantAction,
  context: Record<string, unknown>,
  additionalInstructions?: string
) {
  const response = await fetch('/api/ai/meeting-assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action,
      context,
      additionalInstructions,
    }),
  });

  if (!response.ok) {
    throw new Error('AI assistant request failed');
  }

  return response.json();
}

// ============================================================================
// RESULT DISPLAY COMPONENTS
// ============================================================================

function AgendaSuggestionResult({
  items,
  onAccept,
  onDismiss,
}: {
  items: GeneratedAgendaItem[];
  onAccept: () => void;
  onDismiss: () => void;
}) {
  const typeColors: Record<AgendaItemType, string> = {
    information: 'bg-blue-500/10 text-blue-500',
    decision: 'bg-green-500/10 text-green-500',
    discussion: 'bg-amber-500/10 text-amber-500',
    formality: 'bg-slate-500/10 text-slate-500',
  };

  return (
    <div className="space-y-4">
      <div className="max-h-80 overflow-y-auto space-y-2">
        {items.map((item, index) => (
          <div key={index} className="p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-2 mb-1">
              <Badge className={cn('text-xs', typeColors[item.type])}>
                {item.type}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {item.estimatedDuration} min
              </span>
            </div>
            <p className="font-medium">{item.title}</p>
            {item.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {item.description}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onDismiss}>
          Dismiss
        </Button>
        <Button onClick={onAccept}>
          <Check className="mr-2 h-4 w-4" />
          Use This Agenda
        </Button>
      </div>
    </div>
  );
}

function TalkingPointsResult({
  points,
  onCopy,
}: {
  points: TalkingPoints;
  onCopy: () => void;
}) {
  return (
    <div className="space-y-4">
      {points.mainPoints.length > 0 && (
        <div>
          <h4 className="font-medium text-sm mb-2">Key Points</h4>
          <ul className="list-disc pl-4 space-y-1">
            {points.mainPoints.map((point, i) => (
              <li key={i} className="text-sm">{point}</li>
            ))}
          </ul>
        </div>
      )}

      {points.discussionQuestions.length > 0 && (
        <div>
          <h4 className="font-medium text-sm mb-2">Discussion Questions</h4>
          <ul className="list-disc pl-4 space-y-1">
            {points.discussionQuestions.map((q, i) => (
              <li key={i} className="text-sm">{q}</li>
            ))}
          </ul>
        </div>
      )}

      {points.keyTakeaways.length > 0 && (
        <div>
          <h4 className="font-medium text-sm mb-2">Key Takeaways</h4>
          <ul className="list-disc pl-4 space-y-1">
            {points.keyTakeaways.map((t, i) => (
              <li key={i} className="text-sm">{t}</li>
            ))}
          </ul>
        </div>
      )}

      <Button variant="outline" size="sm" onClick={onCopy}>
        <Copy className="mr-2 h-4 w-4" />
        Copy to Clipboard
      </Button>
    </div>
  );
}

function MotionResult({
  motion,
  onCopy,
}: {
  motion: MotionSuggestion;
  onCopy: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg bg-muted">
        <p className="font-medium italic">&ldquo;{motion.motionText}&rdquo;</p>
      </div>

      <div>
        <h4 className="font-medium text-sm mb-1">Rationale</h4>
        <p className="text-sm text-muted-foreground">{motion.rationale}</p>
      </div>

      <div>
        <h4 className="font-medium text-sm mb-1">Suggested Voting Method</h4>
        <Badge variant="outline">{motion.suggestedVotingMethod}</Badge>
      </div>

      <Button variant="outline" size="sm" onClick={onCopy}>
        <Copy className="mr-2 h-4 w-4" />
        Copy Motion Text
      </Button>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AIAssistant({
  meetingType,
  meetingTitle,
  meetingDescription,
  organizationName,
  industry,
  agendaItems,
  currentItem,
  onAgendaSuggestion,
  locale = 'en',
  className,
}: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<AssistantAction | null>(null);
  const [result, setResult] = useState<unknown>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [copied, setCopied] = useState(false);

  const runAction = async (action: AssistantAction, additionalInstructions?: string) => {
    setIsLoading(true);
    setActiveAction(action);
    setResult(null);

    try {
      const response = await callAIAssistant(
        action,
        {
          meetingType,
          meetingTitle,
          meetingDescription,
          organizationName,
          industry,
          agendaItems,
          currentItem,
          locale,
        },
        additionalInstructions
      );

      setResult(response.result);
    } catch (error) {
      console.error('AI Assistant error:', error);
      setResult({ error: 'Failed to get AI assistance' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAcceptAgenda = () => {
    if (result && onAgendaSuggestion) {
      onAgendaSuggestion(result as GeneratedAgendaItem[]);
    }
    setIsOpen(false);
  };

  const renderResult = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">
            {locale === 'sv' ? 'Arbetar...' : 'Thinking...'}
          </span>
        </div>
      );
    }

    if (!result) return null;

    const resultData = result as Record<string, unknown>;

    if (resultData.error) {
      return (
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive">
          {resultData.error as string}
        </div>
      );
    }

    switch (activeAction) {
      case 'generate_agenda':
        return Array.isArray(result) ? (
          <AgendaSuggestionResult
            items={result as GeneratedAgendaItem[]}
            onAccept={handleAcceptAgenda}
            onDismiss={() => setIsOpen(false)}
          />
        ) : null;

      case 'generate_talking_points':
        return (
          <TalkingPointsResult
            points={result as TalkingPoints}
            onCopy={() => {
              const points = result as TalkingPoints;
              const text = [
                'Key Points:',
                ...points.mainPoints.map(p => `• ${p}`),
                '',
                'Discussion Questions:',
                ...points.discussionQuestions.map(q => `• ${q}`),
              ].join('\n');
              handleCopy(text);
            }}
          />
        );

      case 'suggest_motion':
        return (
          <MotionResult
            motion={result as MotionSuggestion}
            onCopy={() => handleCopy((result as MotionSuggestion).motionText)}
          />
        );

      case 'extract_action_items':
        const actions = result as ActionItemSuggestion[];
        return (
          <div className="space-y-2">
            {Array.isArray(actions) && actions.map((item, i) => (
              <div key={i} className="p-3 rounded-lg border">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={
                    item.priority === 'high' ? 'destructive' :
                    item.priority === 'medium' ? 'default' : 'secondary'
                  }>
                    {item.priority}
                  </Badge>
                  {item.assignee && (
                    <span className="text-xs text-muted-foreground">
                      → {item.assignee}
                    </span>
                  )}
                </div>
                <p className="font-medium text-sm">{item.title}</p>
                {item.description && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        );

      default:
        return (
          <div className="p-4 rounded-lg bg-muted">
            <pre className="text-sm whitespace-pre-wrap">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        );
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className={cn('gap-2', className)}>
            <Sparkles className="h-4 w-4" />
            {locale === 'sv' ? 'AI-assistans' : 'AI Assist'}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem
            onClick={() => {
              setIsOpen(true);
              runAction('generate_agenda');
            }}
          >
            <FileText className="mr-2 h-4 w-4" />
            {locale === 'sv' ? 'Föreslå dagordning' : 'Suggest Agenda'}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => {
              setIsOpen(true);
              runAction('suggest_topics');
            }}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            {locale === 'sv' ? 'Föreslå ämnen' : 'Suggest Topics'}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {currentItem && (
            <>
              <DropdownMenuItem
                onClick={() => {
                  setIsOpen(true);
                  runAction('generate_talking_points');
                }}
              >
                <ListTodo className="mr-2 h-4 w-4" />
                {locale === 'sv' ? 'Samtalsämnen' : 'Talking Points'}
              </DropdownMenuItem>

              {currentItem.type === 'decision' && (
                <DropdownMenuItem
                  onClick={() => {
                    setIsOpen(true);
                    runAction('suggest_motion');
                  }}
                >
                  <Gavel className="mr-2 h-4 w-4" />
                  {locale === 'sv' ? 'Föreslå beslut' : 'Suggest Motion'}
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />
            </>
          )}

          <DropdownMenuItem
            onClick={() => {
              setIsOpen(true);
              setActiveAction(null);
              setResult(null);
            }}
          >
            <Wand2 className="mr-2 h-4 w-4" />
            {locale === 'sv' ? 'Anpassad förfrågan' : 'Custom Request'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Result Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              {locale === 'sv' ? 'AI-assistans' : 'AI Assistant'}
            </DialogTitle>
            <DialogDescription>
              {activeAction
                ? locale === 'sv'
                  ? 'AI-genererade förslag baserat på möteskontexten'
                  : 'AI-generated suggestions based on meeting context'
                : locale === 'sv'
                  ? 'Beskriv vad du behöver hjälp med'
                  : 'Describe what you need help with'}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {!activeAction && (
              <div className="space-y-4">
                <Textarea
                  placeholder={
                    locale === 'sv'
                      ? 'T.ex. "Skapa en dagordning för ett styrelsemöte om kvartalsresultat"'
                      : 'E.g. "Create an agenda for a board meeting about quarterly results"'
                  }
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  rows={4}
                />
                <Button
                  onClick={() => runAction('generate_agenda', customPrompt)}
                  disabled={!customPrompt.trim()}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  {locale === 'sv' ? 'Generera' : 'Generate'}
                </Button>
              </div>
            )}

            {renderResult()}
          </div>

          {copied && (
            <div className="absolute top-4 right-12 bg-green-500 text-white px-3 py-1 rounded text-sm">
              Copied!
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default AIAssistant;
