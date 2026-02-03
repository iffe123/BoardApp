'use client';

/**
 * Meeting Minutes Component
 *
 * Handles the generation, editing, and signing of meeting minutes.
 * Supports Swedish governance requirements including Chair + Adjuster signatures.
 */

import React, { useState, useCallback } from 'react';
import {
  FileText,
  Edit,
  Check,
  X,
  Send,
  Download,
  AlertTriangle,
  UserCheck,
  Pen,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { UserAvatar } from '@/components/ui/avatar';
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
import { cn, getDecisionOutcomeColor, getAgendaItemTypeColor } from '@/lib/utils';
import type { MeetingMinutes, MinuteItem, MinuteSignature, ActionItem } from '@/types/schema';
import { Timestamp } from 'firebase/firestore';

// ============================================================================
// TYPES
// ============================================================================

interface MeetingMinutesProps {
  minutes: MeetingMinutes;
  onUpdate: (minutes: MeetingMinutes) => void;
  onSign: (signerId: string, role: 'chair' | 'adjuster' | 'secretary') => Promise<void>;
  onDistribute: () => Promise<void>;
  currentUserId: string;
  currentUserRole?: string;
  canEdit: boolean;
  isLoading?: boolean;
}

// ============================================================================
// STATUS HELPERS
// ============================================================================

function getStatusConfig(status: string): { label: string; color: string; icon: React.ReactNode } {
  const configs: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    draft: {
      label: 'Draft',
      color: 'bg-gray-100 text-gray-800',
      icon: <Edit className="h-3 w-3" />,
    },
    review: {
      label: 'In Review',
      color: 'bg-blue-100 text-blue-800',
      icon: <Clock className="h-3 w-3" />,
    },
    pending_signatures: {
      label: 'Awaiting Signatures',
      color: 'bg-amber-100 text-amber-800',
      icon: <Pen className="h-3 w-3" />,
    },
    signed: {
      label: 'Signed',
      color: 'bg-green-100 text-green-800',
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    distributed: {
      label: 'Distributed',
      color: 'bg-purple-100 text-purple-800',
      icon: <Send className="h-3 w-3" />,
    },
  };
  return configs[status] || configs.draft;
}

// ============================================================================
// MINUTE ITEM EDITOR
// ============================================================================

interface MinuteItemEditorProps {
  item: MinuteItem;
  onUpdate: (item: MinuteItem) => void;
  canEdit: boolean;
}

function MinuteItemEditor({ item, onUpdate, canEdit }: MinuteItemEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [discussion, setDiscussion] = useState(item.discussion);

  const handleSave = () => {
    onUpdate({ ...item, discussion });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setDiscussion(item.discussion);
    setIsEditing(false);
  };

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        {/* Item Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
              {item.orderIndex + 1}
            </span>
            <Badge className={getAgendaItemTypeColor(item.type)}>{item.type}</Badge>
            <h4 className="font-medium">{item.title}</h4>
          </div>

          {canEdit && !isEditing && (
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
          )}
        </div>

        {/* Discussion Content */}
        {isEditing ? (
          <div className="space-y-3">
            <Textarea
              value={discussion}
              onChange={(e) => setDiscussion(e.target.value)}
              rows={4}
              placeholder="Enter the discussion notes and outcomes..."
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={handleCancel}>
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Check className="h-4 w-4 mr-1" />
                Save
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground whitespace-pre-wrap">
            {item.discussion || (
              <span className="italic">No notes recorded for this item.</span>
            )}
          </div>
        )}

        {/* Decision Outcome */}
        {item.decision && (
          <div className="mt-4 rounded-md bg-muted/50 p-3">
            <div className="flex items-center gap-2 mb-2">
              <strong className="text-sm">Decision:</strong>
              <Badge className={getDecisionOutcomeColor(item.decision.outcome)}>
                {item.decision.outcome}
              </Badge>
            </div>
            <p className="text-sm">{item.decision.motion}</p>
            {(item.decision.votesFor !== undefined ||
              item.decision.votesAgainst !== undefined) && (
              <p className="text-xs text-muted-foreground mt-1">
                Votes: {item.decision.votesFor || 0} for, {item.decision.votesAgainst || 0} against,{' '}
                {item.decision.abstentions || 0} abstained
              </p>
            )}
          </div>
        )}

        {/* Recusals */}
        {item.recusals && item.recusals.length > 0 && (
          <div className="mt-4 rounded-md bg-amber-50 p-3">
            <div className="flex items-center gap-2 text-amber-800 mb-2">
              <AlertTriangle className="h-4 w-4" />
              <strong className="text-sm">Recusals (Jäv)</strong>
            </div>
            <ul className="text-sm space-y-1">
              {item.recusals.map((recusal, idx) => (
                <li key={idx}>
                  <strong>{recusal.memberName}</strong>: {recusal.reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Items */}
        {item.actionItems.length > 0 && (
          <div className="mt-4">
            <h5 className="text-sm font-medium mb-2">Action Items</h5>
            <ul className="space-y-2">
              {item.actionItems.map((action: ActionItem) => (
                <li key={action.id} className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={action.status === 'completed'}
                    disabled
                    className="mt-0.5 rounded"
                  />
                  <div>
                    <span>{action.title}</span>
                    {action.assigneeName && (
                      <span className="text-muted-foreground"> - {action.assigneeName}</span>
                    )}
                    {action.dueDate && (
                      <span className="text-muted-foreground ml-2">
                        (Due: {action.dueDate.toDate().toLocaleDateString()})
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// SIGNATURE PANEL
// ============================================================================

interface SignaturePanelProps {
  signatures: MinuteSignature[];
  onSign: (role: 'chair' | 'adjuster' | 'secretary') => Promise<void>;
  currentUserId: string;
  isLoading?: boolean;
}

function SignaturePanel({ signatures, onSign, currentUserId, isLoading }: SignaturePanelProps) {
  const roleOrder = ['chair', 'adjuster', 'secretary'] as const;

  const getSignatureForRole = (role: string) =>
    signatures.find((s) => s.signerRole === role);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Signatures</CardTitle>
        <CardDescription>
          Minutes must be signed by the Chair and verified by an Adjuster (Justeringsman)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {roleOrder.map((role) => {
          const signature = getSignatureForRole(role);
          const canSign =
            signature?.signerId === currentUserId && signature?.status === 'pending';

          return (
            <div
              key={role}
              className={cn(
                'flex items-center justify-between p-3 rounded-lg border',
                signature?.status === 'signed' && 'bg-green-50 border-green-200',
                signature?.status === 'declined' && 'bg-red-50 border-red-200'
              )}
            >
              <div className="flex items-center gap-3">
                {signature ? (
                  <UserAvatar name={signature.signerName} size="sm" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                    <UserCheck className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <p className="font-medium capitalize">{role}</p>
                  <p className="text-sm text-muted-foreground">
                    {signature?.signerName || 'Not assigned'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {signature?.status === 'signed' ? (
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm">
                      Signed {signature.signedAt?.toDate().toLocaleDateString()}
                    </span>
                  </div>
                ) : signature?.status === 'declined' ? (
                  <div className="flex items-center gap-2 text-red-700">
                    <XCircle className="h-4 w-4" />
                    <span className="text-sm">Declined</span>
                  </div>
                ) : canSign ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" isLoading={isLoading}>
                        <Pen className="h-4 w-4 mr-1" />
                        Sign
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Sign Minutes</AlertDialogTitle>
                        <AlertDialogDescription>
                          By signing, you confirm that these minutes accurately reflect
                          the proceedings of the meeting. This action will be recorded
                          with a digital signature.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onSign(role)}>
                          Confirm & Sign
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <Badge variant="outline" className="gap-1">
                    <Clock className="h-3 w-3" />
                    Pending
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function MeetingMinutesEditor({
  minutes,
  onUpdate,
  onSign,
  onDistribute,
  currentUserId,
  canEdit,
  isLoading,
}: MeetingMinutesProps) {
  const [localMinutes, setLocalMinutes] = useState(minutes);
  const statusConfig = getStatusConfig(minutes.status);

  const handleItemUpdate = useCallback(
    (updatedItem: MinuteItem) => {
      const newItemMinutes = localMinutes.itemMinutes.map((item) =>
        item.agendaItemId === updatedItem.agendaItemId ? updatedItem : item
      );
      const newMinutes = { ...localMinutes, itemMinutes: newItemMinutes };
      setLocalMinutes(newMinutes);
      onUpdate(newMinutes);
    },
    [localMinutes, onUpdate]
  );

  const handleSign = async (role: 'chair' | 'adjuster' | 'secretary') => {
    await onSign(currentUserId, role);
  };

  const allSigned = minutes.signatures.every((s) => s.status === 'signed');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Meeting Minutes</h2>
          <p className="text-muted-foreground">
            Version {minutes.version} &middot; Last updated{' '}
            {minutes.updatedAt.toDate().toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={cn('gap-1', statusConfig.color)}>
            {statusConfig.icon}
            {statusConfig.label}
          </Badge>

          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            Export PDF
          </Button>

          {allSigned && minutes.status !== 'distributed' && (
            <Button onClick={onDistribute} isLoading={isLoading}>
              <Send className="h-4 w-4 mr-1" />
              Distribute
            </Button>
          )}
        </div>
      </div>

      {/* Meeting Header Info */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Meeting Number</p>
              <p className="font-medium">{minutes.header.meetingNumber || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Date</p>
              <p className="font-medium">
                {minutes.header.meetingDate.toDate().toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Location</p>
              <p className="font-medium">{minutes.header.location}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Duration</p>
              <p className="font-medium">
                {minutes.header.callToOrder.toDate().toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                -{' '}
                {minutes.header.adjournment?.toDate().toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                }) || 'TBD'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Attendance</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Present</p>
            <ul className="text-sm space-y-1">
              {minutes.attendance.present.map((name) => (
                <li key={name} className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                  {name}
                </li>
              ))}
            </ul>
          </div>
          {minutes.attendance.absent.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Absent</p>
              <ul className="text-sm space-y-1">
                {minutes.attendance.absent.map((name) => (
                  <li key={name} className="flex items-center gap-1">
                    <XCircle className="h-3 w-3 text-red-600" />
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {minutes.attendance.excused.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Excused</p>
              <ul className="text-sm space-y-1">
                {minutes.attendance.excused.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </div>
          )}
          {minutes.attendance.guests.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Guests</p>
              <ul className="text-sm space-y-1">
                {minutes.attendance.guests.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Summary (if available) */}
      {minutes.aiSummary && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-4 w-4" />
              AI-Generated Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{minutes.aiSummary}</p>
          </CardContent>
        </Card>
      )}

      {/* Minutes Items */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Meeting Proceedings</h3>
        {localMinutes.itemMinutes.map((item) => (
          <MinuteItemEditor
            key={item.agendaItemId}
            item={item}
            onUpdate={handleItemUpdate}
            canEdit={canEdit && minutes.status === 'draft'}
          />
        ))}
      </div>

      {/* Signature Panel */}
      {minutes.status !== 'draft' && (
        <SignaturePanel
          signatures={minutes.signatures}
          onSign={handleSign}
          currentUserId={currentUserId}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}

export default MeetingMinutesEditor;
