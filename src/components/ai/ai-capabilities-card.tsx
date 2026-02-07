'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  TrendingUp,
  DollarSign,
  FileText,
  CheckSquare,
  Calendar,
  Scale,
  Edit,
  Sparkles,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  getAIService,
  AI_CAPABILITIES,
  AI_SETUP_INSTRUCTIONS,
} from '@/lib/ai-service';

interface AICapabilitiesCardProps {
  className?: string;
  showSetupOnError?: boolean;
}

const ICONS = {
  Shield,
  TrendingUp,
  DollarSign,
  FileText,
  CheckSquare,
  Calendar,
  Scale,
  Edit,
};

export function AICapabilitiesCard({
  className,
  showSetupOnError = true,
}: AICapabilitiesCardProps) {
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    checkAIAvailability();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAIAvailability = async () => {
    setIsChecking(true);
    try {
      const aiService = getAIService();
      const result = await aiService.checkAvailability();
      setIsAvailable(result.available);
      if (!result.available && showSetupOnError) {
        setShowSetup(true);
      }
    } catch {
      setIsAvailable(false);
      if (showSetupOnError) {
        setShowSetup(true);
      }
    } finally {
      setIsChecking(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>AI-Powered Features</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {isChecking ? (
              <Badge variant="outline" className="gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Checking...
              </Badge>
            ) : isAvailable ? (
              <Badge variant="default" className="gap-1 bg-green-600">
                <CheckCircle2 className="h-3 w-3" />
                Active
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="h-3 w-3" />
                Not Configured
              </Badge>
            )}
          </div>
        </div>
        <CardDescription>
          Intelligent analysis powered by Anthropic Claude
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Capabilities Grid */}
        <div className="grid gap-3 sm:grid-cols-2">
          {Object.entries(AI_CAPABILITIES).map(([key, capability]) => {
            const Icon = ICONS[capability.icon as keyof typeof ICONS] || Sparkles;
            return (
              <div
                key={key}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border',
                  isAvailable ? 'bg-background' : 'bg-muted/50 opacity-60'
                )}
              >
                <div
                  className={cn(
                    'p-2 rounded-md',
                    isAvailable ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{capability.name}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {capability.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Setup Instructions */}
        {!isAvailable && showSetup && (
          <div className="mt-4 p-4 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
            <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-3">
              {AI_SETUP_INSTRUCTIONS.title}
            </h4>
            <p className="text-sm text-amber-700 dark:text-amber-300 mb-4">
              {AI_SETUP_INSTRUCTIONS.description}
            </p>

            {Object.entries(AI_SETUP_INSTRUCTIONS.providers).map(([key, provider]) => (
              <div key={key} className="mb-4">
                <h5 className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                  {provider.name}
                </h5>
                <div className="space-y-4">
                  {provider.steps.map((step: { title: string; description: string; url?: string; action?: string; code?: string }, index: number) => (
                    <div key={index} className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center text-sm font-medium text-amber-800 dark:text-amber-200">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm text-amber-800 dark:text-amber-200">
                          {step.title}
                        </p>
                        <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                          {step.description}
                        </p>
                        {step.url && (
                          <a
                            href={step.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-amber-800 dark:text-amber-200 hover:underline mt-1"
                          >
                            {step.action || 'Learn More'}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                        {step.code && (
                          <div className="mt-2 relative">
                            <pre className="text-xs bg-amber-100 dark:bg-amber-900 rounded p-2 pr-10 overflow-x-auto">
                              <code>{step.code}</code>
                            </pre>
                            <button
                              onClick={() => copyToClipboard(step.code!, `${key}-step-${index}`)}
                              className="absolute right-2 top-2 p-1 rounded hover:bg-amber-200 dark:hover:bg-amber-800"
                            >
                              {copiedCode === `${key}-step-${index}` ? (
                                <Check className="h-3 w-3 text-green-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="mt-4 pt-4 border-t border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
                <Shield className="h-4 w-4" />
                <span>API keys are stored securely. Firebase AI uses project credentials.</span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          {!isAvailable && !showSetup && (
            <Button variant="outline" size="sm" onClick={() => setShowSetup(true)}>
              Show Setup Instructions
            </Button>
          )}
          {isAvailable && (
            <Button variant="outline" size="sm" onClick={checkAIAvailability}>
              <Loader2
                className={cn('h-4 w-4 mr-2', isChecking && 'animate-spin')}
              />
              Refresh Status
            </Button>
          )}
          <a
            href="https://console.anthropic.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            Anthropic Console
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
