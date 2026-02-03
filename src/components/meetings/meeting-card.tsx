'use client';

/**
 * Meeting Card Component
 *
 * Displays a meeting summary in a card format for lists and grids.
 */

import React from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  Users,
  FileText,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/avatar';
import { cn, formatDate, formatDuration, getMeetingStatusColor } from '@/lib/utils';
import type { Meeting, MeetingAttendee } from '@/types/schema';
import { Timestamp } from 'firebase/firestore';

interface MeetingCardProps {
  meeting: Meeting;
  tenantId: string;
  onClick?: () => void;
  className?: string;
}

function formatMeetingTime(start: Timestamp, end: Timestamp): string {
  const startDate = start.toDate();
  const endDate = end.toDate();

  const timeFormat: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
  };

  return `${startDate.toLocaleTimeString([], timeFormat)} - ${endDate.toLocaleTimeString([], timeFormat)}`;
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Draft',
    scheduled: 'Scheduled',
    active: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return labels[status] || status;
}

function getMeetingTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    ordinary: 'Board Meeting',
    extraordinary: 'Extraordinary Meeting',
    annual_general: 'Annual General Meeting',
    statutory: 'Statutory Meeting',
  };
  return labels[type] || type;
}

export function MeetingCard({ meeting, tenantId, onClick, className }: MeetingCardProps) {
  const attendeesAccepted = meeting.attendees.filter(
    (a: MeetingAttendee) => a.response === 'accepted'
  ).length;
  const hasQuorum = attendeesAccepted >= meeting.quorumRequired;

  const CardWrapper = onClick ? 'div' : Link;
  const cardProps = onClick
    ? { onClick, className: 'cursor-pointer' }
    : { href: `/dashboard/${tenantId}/meetings/${meeting.id}` };

  return (
    <CardWrapper {...cardProps}>
      <Card
        className={cn(
          'transition-all hover:shadow-md hover:border-primary/50',
          meeting.status === 'active' && 'border-green-500 shadow-green-100',
          className
        )}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge className={getMeetingStatusColor(meeting.status)}>
                  {getStatusLabel(meeting.status)}
                </Badge>
                {meeting.status === 'active' && (
                  <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                )}
              </div>
              <h3 className="font-semibold text-lg">{meeting.title}</h3>
              <p className="text-sm text-muted-foreground">
                {getMeetingTypeLabel(meeting.meetingType)}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Date & Time */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{formatDate(meeting.scheduledStart.toDate())}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{formatMeetingTime(meeting.scheduledStart, meeting.scheduledEnd)}</span>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center gap-2 text-sm">
            {meeting.location.type === 'virtual' ? (
              <>
                <Video className="h-4 w-4 text-muted-foreground" />
                <span>{meeting.location.videoConferencePlatform || 'Video Conference'}</span>
              </>
            ) : meeting.location.type === 'hybrid' ? (
              <>
                <Video className="h-4 w-4 text-muted-foreground" />
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>Hybrid - {meeting.location.address || meeting.location.room}</span>
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{meeting.location.address || meeting.location.room || 'TBD'}</span>
              </>
            )}
          </div>

          {/* Attendees & Quorum */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div className="flex -space-x-2">
                {meeting.attendees.slice(0, 4).map((attendee: MeetingAttendee) => (
                  <UserAvatar
                    key={attendee.memberId}
                    name={attendee.displayName}
                    size="sm"
                    className="border-2 border-background"
                  />
                ))}
                {meeting.attendees.length > 4 && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium border-2 border-background">
                    +{meeting.attendees.length - 4}
                  </div>
                )}
              </div>
              <span className="text-sm text-muted-foreground">
                {attendeesAccepted}/{meeting.attendees.length} confirmed
              </span>
            </div>

            {!hasQuorum && meeting.status !== 'completed' && meeting.status !== 'cancelled' && (
              <Badge variant="warning" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                No quorum
              </Badge>
            )}
          </div>

          {/* Agenda Items & Documents */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground border-t pt-3">
            <div className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              <span>{meeting.agendaItems.length} agenda items</span>
            </div>
            {meeting.documentIds.length > 0 && (
              <div className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                <span>{meeting.documentIds.length} documents</span>
              </div>
            )}
            <span className="text-xs">
              {formatDuration(
                meeting.agendaItems.reduce((sum, item) => sum + item.estimatedDuration, 0)
              )}
            </span>
          </div>
        </CardContent>
      </Card>
    </CardWrapper>
  );
}

export default MeetingCard;
