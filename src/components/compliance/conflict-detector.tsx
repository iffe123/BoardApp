'use client';

/**
 * Conflict of Interest (Jäv) Detection Component
 *
 * Implements Swedish corporate governance requirements for detecting
 * and managing conflicts of interest during board meetings.
 */

import React, { useMemo } from 'react';
import {
  AlertTriangle,
  Shield,
  UserX,
  EyeOff,
  X,
  Info,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { UserAvatar } from '@/components/ui/avatar';
import { cn, fuzzyMatch } from '@/lib/utils';
import type { AgendaItem, Member, ConflictOfInterest } from '@/types/schema';

// ============================================================================
// TYPES
// ============================================================================

interface ConflictDetectorProps {
  agendaItem: AgendaItem;
  members: Member[];
  currentUserId: string;
  onRecuse: (memberId: string, agendaItemId: string, reason: string) => Promise<void>;
  onCancelRecusal: (memberId: string, agendaItemId: string) => Promise<void>;
  isLocked?: boolean;
}

interface ConflictMatch {
  memberId: string;
  memberName: string;
  conflict: ConflictOfInterest;
  matchedKeyword: string;
}

interface RecusalWarningProps {
  isRecused: boolean;
  memberName: string;
  reason?: string;
  onRecuse: () => void;
  onCancel: () => void;
  isCurrentUser: boolean;
  isLocked?: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function detectConflicts(
  agendaItem: AgendaItem,
  members: Member[]
): ConflictMatch[] {
  const matches: ConflictMatch[] = [];

  if (!agendaItem.conflictKeywords || agendaItem.conflictKeywords.length === 0) {
    return matches;
  }

  for (const member of members) {
    if (!member.conflicts || member.conflicts.length === 0) continue;

    for (const conflict of member.conflicts) {
      if (!conflict.isActive) continue;

      for (const keyword of agendaItem.conflictKeywords) {
        if (
          fuzzyMatch(conflict.entityName, keyword) ||
          (conflict.organizationNumber && keyword.includes(conflict.organizationNumber))
        ) {
          matches.push({
            memberId: member.id,
            memberName: member.title || member.userId,
            conflict,
            matchedKeyword: keyword,
          });
          break; // One match per conflict is enough
        }
      }
    }
  }

  return matches;
}

// ============================================================================
// RECUSAL WARNING COMPONENT
// ============================================================================

function RecusalWarning({
  isRecused,
  memberName,
  reason,
  onRecuse,
  onCancel,
  isCurrentUser,
  isLocked,
}: RecusalWarningProps) {
  if (isRecused) {
    return (
      <div className="flex items-center gap-2 rounded-md bg-amber-50 p-2 text-amber-800">
        <UserX className="h-4 w-4" />
        <span className="text-sm">
          {isCurrentUser ? 'You have' : `${memberName} has`} recused from this item
          {reason && `: ${reason}`}
        </span>
        {!isLocked && isCurrentUser && (
          <Button variant="ghost" size="xs" onClick={onCancel} className="ml-auto">
            <X className="h-3 w-3 mr-1" />
            Cancel Recusal
          </Button>
        )}
      </div>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-amber-500 text-amber-700 hover:bg-amber-50"
          disabled={isLocked}
        >
          <UserX className="h-4 w-4 mr-1" />
          {isCurrentUser ? 'Recuse Yourself' : `Recuse ${memberName}`}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Confirm Recusal (Jäv)
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isCurrentUser ? (
              <>
                By recusing yourself from this agenda item, you acknowledge a
                conflict of interest (jäv) and will not participate in the
                discussion or vote on this matter. This will be recorded in the
                meeting minutes.
              </>
            ) : (
              <>
                This will record that {memberName} has recused from this agenda
                item due to a conflict of interest (jäv). They will not
                participate in the discussion or vote on this matter.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onRecuse} className="bg-amber-600 hover:bg-amber-700">
            Confirm Recusal
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ============================================================================
// CONFLICT ALERT CARD
// ============================================================================

interface ConflictAlertCardProps {
  matches: ConflictMatch[];
  agendaItem: AgendaItem;
  currentUserId: string;
  onRecuse: (memberId: string) => void;
  onCancelRecusal: (memberId: string) => void;
  isLocked?: boolean;
}

function ConflictAlertCard({
  matches,
  agendaItem,
  currentUserId,
  onRecuse,
  onCancelRecusal,
  isLocked,
}: ConflictAlertCardProps) {
  const hasCurrentUserConflict = matches.some(
    (m) => m.memberId === currentUserId
  );

  return (
    <Card className="border-amber-300 bg-amber-50">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <CardTitle className="text-base text-amber-800">
            Potential Conflicts of Interest Detected
          </CardTitle>
        </div>
        <CardDescription className="text-amber-700">
          The following members may have conflicts with this agenda item and
          should consider recusing themselves.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {matches.map((match) => {
          const isRecused = agendaItem.recusedMemberIds?.includes(match.memberId);
          const isCurrentUser = match.memberId === currentUserId;

          return (
            <div
              key={`${match.memberId}-${match.conflict.id}`}
              className={cn(
                'flex items-center justify-between rounded-md p-3',
                isRecused ? 'bg-amber-100' : 'bg-white border'
              )}
            >
              <div className="flex items-center gap-3">
                <UserAvatar name={match.memberName} size="sm" />
                <div>
                  <p className="font-medium">
                    {match.memberName}
                    {isCurrentUser && <span className="text-muted-foreground"> (You)</span>}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {match.conflict.relationship} of{' '}
                    <strong>{match.conflict.entityName}</strong>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Matched keyword: &quot;{match.matchedKeyword}&quot;
                  </p>
                </div>
              </div>

              <RecusalWarning
                isRecused={isRecused}
                memberName={match.memberName}
                onRecuse={() => onRecuse(match.memberId)}
                onCancel={() => onCancelRecusal(match.memberId)}
                isCurrentUser={isCurrentUser}
                isLocked={isLocked}
              />
            </div>
          );
        })}

        {hasCurrentUserConflict && !agendaItem.recusedMemberIds?.includes(currentUserId) && (
          <div className="rounded-md bg-red-50 p-3 text-red-800 text-sm flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              <strong>Important:</strong> You have a potential conflict of interest
              with this agenda item. You should recuse yourself from participating
              in the discussion and voting to comply with Swedish corporate
              governance regulations.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// RECUSAL OVERLAY FOR CONFLICTED USERS
// ============================================================================

interface RecusalOverlayProps {
  isRecused: boolean;
  memberName: string;
  reason?: string;
  children: React.ReactNode;
}

export function RecusalOverlay({ isRecused, memberName: _memberName, reason: _reason, children }: RecusalOverlayProps) {
  // memberName and reason are available for future use in the overlay message
  void _memberName;
  void _reason;
  if (!isRecused) return <>{children}</>;

  return (
    <div className="relative">
      <div className="pointer-events-none select-none blur-sm opacity-50">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-amber-50/80 rounded-lg">
        <div className="text-center p-6">
          <EyeOff className="h-12 w-12 mx-auto text-amber-600 mb-4" />
          <h3 className="text-lg font-semibold text-amber-800">
            Content Hidden - Recused
          </h3>
          <p className="text-sm text-amber-700 mt-2">
            You have recused yourself from this agenda item due to a conflict
            of interest. The content is hidden to maintain compliance with
            Swedish corporate governance regulations.
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// VOTING BLOCKER
// ============================================================================

interface VotingBlockerProps {
  isBlocked: boolean;
  reason?: string;
  children: React.ReactNode;
}

export function VotingBlocker({ isBlocked, reason, children }: VotingBlockerProps) {
  if (!isBlocked) return <>{children}</>;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative cursor-not-allowed">
            <div className="pointer-events-none opacity-50">{children}</div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Badge variant="destructive" className="gap-1">
                <UserX className="h-3 w-3" />
                Voting Blocked
              </Badge>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{reason || 'You are recused from voting on this item due to conflict of interest'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ConflictDetector({
  agendaItem,
  members,
  currentUserId,
  onRecuse,
  onCancelRecusal,
  isLocked,
}: ConflictDetectorProps) {
  // Detect potential conflicts
  const conflictMatches = useMemo(
    () => detectConflicts(agendaItem, members),
    [agendaItem, members]
  );

  // Check if current user is recused (available for future use)
  void agendaItem.recusedMemberIds?.includes(currentUserId);

  // If no conflicts detected, show status badge
  if (conflictMatches.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Shield className="h-4 w-4 text-green-600" />
        <span>No conflicts of interest detected</span>
      </div>
    );
  }

  // Handle recusal
  const handleRecuse = async (memberId: string) => {
    const match = conflictMatches.find((m) => m.memberId === memberId);
    const reason = match
      ? `${match.conflict.relationship} of ${match.conflict.entityName}`
      : 'Conflict of interest';
    await onRecuse(memberId, agendaItem.id, reason);
  };

  const handleCancelRecusal = async (memberId: string) => {
    await onCancelRecusal(memberId, agendaItem.id);
  };

  return (
    <ConflictAlertCard
      matches={conflictMatches}
      agendaItem={agendaItem}
      currentUserId={currentUserId}
      onRecuse={handleRecuse}
      onCancelRecusal={handleCancelRecusal}
      isLocked={isLocked}
    />
  );
}

// ============================================================================
// CONFLICT REGISTER COMPONENT
// ============================================================================

interface ConflictRegisterProps {
  member: Member;
  onAddConflict: (conflict: Omit<ConflictOfInterest, 'id' | 'declaredAt'>) => Promise<void>;
  onRemoveConflict: (conflictId: string) => Promise<void>;
  canEdit: boolean;
}

export function ConflictRegister({
  member,
  onAddConflict: _onAddConflict,
  onRemoveConflict,
  canEdit,
}: ConflictRegisterProps) {
  // onAddConflict available for future "Add Conflict" functionality
  void _onAddConflict;
  const activeConflicts = member.conflicts?.filter((c) => c.isActive) || [];
  const inactiveConflicts = member.conflicts?.filter((c) => !c.isActive) || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <CardTitle className="text-lg">Conflict of Interest Register</CardTitle>
          </div>
          <Badge variant={activeConflicts.length > 0 ? 'warning' : 'success'}>
            {activeConflicts.length} Active
          </Badge>
        </div>
        <CardDescription>
          Declared interests and relationships that may constitute conflicts (jäv)
          according to the Swedish Companies Act.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeConflicts.length === 0 && inactiveConflicts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 text-green-600" />
            <p>No conflicts of interest declared</p>
            <p className="text-sm mt-2">
              Board members should declare any relationships that may
              constitute conflicts of interest.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeConflicts.map((conflict) => (
              <div
                key={conflict.id}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{conflict.entityName}</span>
                    <Badge variant="outline">{conflict.entityType}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {conflict.relationship}
                  </p>
                  {conflict.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {conflict.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Declared: {conflict.declaredAt.toDate().toLocaleDateString()}
                  </p>
                </div>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveConflict(conflict.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground flex items-start gap-2">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            According to the Swedish Companies Act (Aktiebolagslagen), a board
            member shall not participate in the handling of an agreement between
            themselves and the company, or between the company and a third party
            if the member has a material interest that may conflict with that of
            the company.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default ConflictDetector;
