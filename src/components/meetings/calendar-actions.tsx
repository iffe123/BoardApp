'use client';

/**
 * Calendar Actions Component
 *
 * Provides buttons to add meetings to various calendar services:
 * - Download .ics file
 * - Add to Google Calendar
 * - Add to Outlook Calendar
 * - Send calendar invitations
 */

import React, { useState } from 'react';
import {
  Calendar,
  Download,
  Mail,
  Send,
  Check,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  generateMeetingICalEvent,
  createGoogleCalendarUrl,
  createOutlookCalendarUrl,
  type MeetingCalendarData,
} from '@/lib/calendar-service';

// ============================================================================
// TYPES
// ============================================================================

interface CalendarActionsProps {
  meeting: {
    id: string;
    tenantId: string;
    title: string;
    description?: string;
    meetingType: string;
    scheduledStart: Date;
    scheduledEnd: Date;
    timezone: string;
    location: {
      type: 'physical' | 'virtual' | 'hybrid';
      address?: string;
      room?: string;
      videoConferenceUrl?: string;
      videoConferencePlatform?: string;
      dialInNumber?: string;
      dialInPin?: string;
    };
    attendees: Array<{
      email?: string;
      name?: string;
      role?: string;
    }>;
  };
  organizerEmail?: string;
  organizerName?: string;
  meetingUrl: string;
  onSendInvitations?: () => Promise<{ sent: number; failed: number }>;
  className?: string;
}

// ============================================================================
// CALENDAR ICONS
// ============================================================================

function GoogleCalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M18 4H6C4.89543 4 4 4.89543 4 6V18C4 19.1046 4.89543 20 6 20H18C19.1046 20 20 19.1046 20 18V6C20 4.89543 19.1046 4 18 4Z"
        fill="#4285F4"
      />
      <path d="M8 11H11V14H8V11Z" fill="white" />
      <path d="M13 11H16V14H13V11Z" fill="white" />
      <path d="M8 16H11V18H8V16Z" fill="white" />
      <path d="M13 16H16V18H13V16Z" fill="white" />
      <path d="M8 7H16V9H8V7Z" fill="white" />
    </svg>
  );
}

function OutlookIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M21 6L12 11L3 6V18H21V6Z"
        fill="#0072C6"
      />
      <path
        d="M21 6H3V5C3 4.44772 3.44772 4 4 4H20C20.5523 4 21 4.44772 21 5V6Z"
        fill="#0072C6"
      />
    </svg>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CalendarActions({
  meeting,
  organizerEmail = 'noreply@governanceos.app',
  organizerName = 'GovernanceOS',
  meetingUrl,
  onSendInvitations,
  className,
}: CalendarActionsProps) {
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number } | null>(null);
  const [showResultDialog, setShowResultDialog] = useState(false);

  // Build calendar data
  const calendarData: MeetingCalendarData = {
    meetingId: meeting.id,
    tenantId: meeting.tenantId,
    title: meeting.title,
    description: meeting.description,
    meetingType: meeting.meetingType,
    scheduledStart: meeting.scheduledStart,
    scheduledEnd: meeting.scheduledEnd,
    timezone: meeting.timezone,
    location: meeting.location,
    organizer: {
      email: organizerEmail,
      name: organizerName,
    },
    attendees: meeting.attendees.map(a => ({
      email: a.email || '',
      name: a.name,
      role: a.role,
    })),
    meetingUrl,
  };

  // Generate iCal content
  const icalContent = generateMeetingICalEvent(calendarData);

  // Download .ics file
  const handleDownloadICS = () => {
    const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${meeting.title.replace(/[^a-z0-9]/gi, '_')}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Open Google Calendar
  const handleAddToGoogle = () => {
    const locationParts: string[] = [];
    if (meeting.location.type === 'physical' || meeting.location.type === 'hybrid') {
      if (meeting.location.room) locationParts.push(meeting.location.room);
      if (meeting.location.address) locationParts.push(meeting.location.address);
    }
    if (meeting.location.videoConferenceUrl) {
      locationParts.push(meeting.location.videoConferenceUrl);
    }

    const url = createGoogleCalendarUrl({
      title: meeting.title,
      description: meeting.description,
      startTime: meeting.scheduledStart,
      endTime: meeting.scheduledEnd,
      location: locationParts.join(' | '),
    });

    window.open(url, '_blank');
  };

  // Open Outlook Calendar
  const handleAddToOutlook = () => {
    const locationParts: string[] = [];
    if (meeting.location.room) locationParts.push(meeting.location.room);
    if (meeting.location.address) locationParts.push(meeting.location.address);

    const url = createOutlookCalendarUrl({
      title: meeting.title,
      description: meeting.description,
      startTime: meeting.scheduledStart,
      endTime: meeting.scheduledEnd,
      location: locationParts.join(', '),
    });

    window.open(url, '_blank');
  };

  // Send invitations
  const handleSendInvitations = async () => {
    if (!onSendInvitations) return;

    setIsSending(true);
    try {
      const result = await onSendInvitations();
      setSendResult(result);
      setShowResultDialog(true);
    } catch (error) {
      console.error('Error sending invitations:', error);
      setSendResult({ sent: 0, failed: meeting.attendees.length });
      setShowResultDialog(true);
    } finally {
      setIsSending(false);
    }
  };

  const attendeesWithEmail = meeting.attendees.filter(a => a.email).length;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className={cn('gap-2', className)}>
            <Calendar className="h-4 w-4" />
            Add to Calendar
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          {/* Download ICS */}
          <DropdownMenuItem onClick={handleDownloadICS}>
            <Download className="mr-2 h-4 w-4" />
            Download .ics file
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Google Calendar */}
          <DropdownMenuItem onClick={handleAddToGoogle}>
            <GoogleCalendarIcon className="mr-2 h-4 w-4" />
            Add to Google Calendar
          </DropdownMenuItem>

          {/* Outlook */}
          <DropdownMenuItem onClick={handleAddToOutlook}>
            <OutlookIcon className="mr-2 h-4 w-4" />
            Add to Outlook
          </DropdownMenuItem>

          {/* Send Invitations */}
          {onSendInvitations && attendeesWithEmail > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSendInvitations}
                disabled={isSending}
              >
                {isSending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Send invitations ({attendeesWithEmail})
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Result Dialog */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invitations Sent</DialogTitle>
            <DialogDescription>
              Calendar invitations have been processed.
            </DialogDescription>
          </DialogHeader>

          {sendResult && (
            <div className="py-4 space-y-4">
              <div className="flex items-center justify-center gap-8">
                <div className="text-center">
                  <div className="flex items-center justify-center h-12 w-12 rounded-full bg-green-500/10 mx-auto mb-2">
                    <Check className="h-6 w-6 text-green-500" />
                  </div>
                  <p className="text-2xl font-bold">{sendResult.sent}</p>
                  <p className="text-sm text-muted-foreground">Sent</p>
                </div>

                {sendResult.failed > 0 && (
                  <div className="text-center">
                    <div className="flex items-center justify-center h-12 w-12 rounded-full bg-red-500/10 mx-auto mb-2">
                      <Mail className="h-6 w-6 text-red-500" />
                    </div>
                    <p className="text-2xl font-bold">{sendResult.failed}</p>
                    <p className="text-sm text-muted-foreground">Failed</p>
                  </div>
                )}
              </div>

              {sendResult.sent > 0 && (
                <p className="text-center text-sm text-muted-foreground">
                  Recipients will receive an email with a calendar attachment (.ics).
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowResultDialog(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default CalendarActions;
