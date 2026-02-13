'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Calendar,
  FileText,
  Settings,
  CheckCircle2,
  Circle,
  X,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  completed: boolean;
}

interface OnboardingChecklistProps {
  tenantId: string;
  orgName: string;
  memberCount: number;
  meetingCount: number;
  documentCount: number;
}

// ============================================================================
// LOCAL STORAGE KEY
// ============================================================================

function getDismissKey(tenantId: string): string {
  return `governanceos_onboarding_dismissed_${tenantId}`;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function OnboardingChecklist({
  tenantId,
  orgName,
  memberCount,
  meetingCount,
  documentCount,
}: OnboardingChecklistProps) {
  const [dismissed, setDismissed] = useState(true); // Start hidden to prevent flash

  useEffect(() => {
    const stored = localStorage.getItem(getDismissKey(tenantId));
    setDismissed(stored === 'true');
  }, [tenantId]);

  const handleDismiss = () => {
    localStorage.setItem(getDismissKey(tenantId), 'true');
    setDismissed(true);
  };

  if (dismissed) return null;

  const steps: OnboardingStep[] = [
    {
      id: 'members',
      title: 'Invite board members',
      description: 'Add your fellow board members so they can collaborate.',
      href: `/dashboard/${tenantId}/members`,
      icon: <Users className="h-5 w-5" />,
      completed: memberCount > 1,
    },
    {
      id: 'meeting',
      title: 'Schedule your first meeting',
      description: 'Create a board meeting with an agenda and invite attendees.',
      href: `/dashboard/${tenantId}/meetings/new`,
      icon: <Calendar className="h-5 w-5" />,
      completed: meetingCount > 0,
    },
    {
      id: 'documents',
      title: 'Upload a document',
      description: 'Add board packs, policies, or financial reports.',
      href: `/dashboard/${tenantId}/documents`,
      icon: <FileText className="h-5 w-5" />,
      completed: documentCount > 0,
    },
    {
      id: 'settings',
      title: 'Review organization settings',
      description: 'Configure language, fiscal year, and signing preferences.',
      href: `/dashboard/${tenantId}/settings`,
      icon: <Settings className="h-5 w-5" />,
      completed: false, // Always available as a step
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const allDone = completedCount === steps.length;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent mb-8">
      <CardHeader className="flex flex-row items-start justify-between pb-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">
              Welcome to {orgName}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              Get started by completing these steps to set up your board workspace.
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Dismiss</span>
        </Button>
      </CardHeader>
      <CardContent>
        {/* Progress bar */}
        <div className="mb-5">
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="text-muted-foreground">
              {completedCount} of {steps.length} completed
            </span>
            {allDone && (
              <span className="text-primary font-medium">All done!</span>
            )}
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${(completedCount / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-2">
          {steps.map((step) => (
            <Link
              key={step.id}
              href={step.href}
              className={cn(
                'flex items-center gap-4 p-3 rounded-lg border transition-colors group',
                step.completed
                  ? 'bg-muted/50 border-transparent'
                  : 'hover:bg-muted/50 border-border'
              )}
            >
              <div
                className={cn(
                  'flex items-center justify-center rounded-full',
                  step.completed ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {step.completed ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <Circle className="h-5 w-5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    'text-sm font-medium',
                    step.completed && 'line-through text-muted-foreground'
                  )}
                >
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {step.description}
                </p>
              </div>
              {!step.completed && (
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </Link>
          ))}
        </div>

        {allDone && (
          <div className="mt-4 text-center">
            <Button variant="outline" size="sm" onClick={handleDismiss}>
              Dismiss guide
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
