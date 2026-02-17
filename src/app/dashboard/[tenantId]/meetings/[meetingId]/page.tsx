'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Video,
  Users,
  FileText,
  Edit,
  Play,
  CheckCircle,
  XCircle,
  MoreVertical,
  Download,
  Trash2,
  Copy,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { AgendaBuilder } from '@/components/meetings/agenda-builder';
import { MeetingMinutesEditor } from '@/components/meetings/meeting-minutes';
import { CalendarActions } from '@/components/meetings/calendar-actions';
import { cn, formatDate, formatDuration, getMeetingStatusColor } from '@/lib/utils';
import type { Meeting } from '@/types/schema';
import { Timestamp } from 'firebase/firestore';
import { useMeeting, useMembers } from '@/hooks/use-firestore';

function formatMeetingTime(start: Timestamp, end: Timestamp): string {
  const startDate = start.toDate();
  const endDate = end.toDate();
  const timeFormat: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
  return `${startDate.toLocaleTimeString('sv-SE', timeFormat)} - ${endDate.toLocaleTimeString('sv-SE', timeFormat)}`;
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

function getResponseIcon(response: string) {
  if (response === 'accepted') return <CheckCircle className="h-4 w-4 text-green-500" />;
  if (response === 'declined') return <XCircle className="h-4 w-4 text-red-500" />;
  return <Clock className="h-4 w-4 text-amber-500" />;
}

export default function MeetingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.tenantId as string;
  const meetingId = params.meetingId as string;

  const { data: fetchedMeeting, isLoading: meetingLoading } = useMeeting(tenantId, meetingId);
  const { data: members = [] } = useMembers(tenantId);
  const [meetingOverride, setMeetingOverride] = useState<Meeting | null>(null);
  const meeting = meetingOverride || fetchedMeeting;
  const [activeTab, setActiveTab] = useState('overview');
  const [isGeneratingMinutes, setIsGeneratingMinutes] = useState(false);

  if (meetingLoading) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Loading meeting...</p>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-lg font-semibold mb-2">Meeting not found</h2>
        <p className="text-muted-foreground mb-4">This meeting may have been deleted or you don&apos;t have access.</p>
        <Link href={`/dashboard/${tenantId}/meetings`}>
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Meetings
          </Button>
        </Link>
      </div>
    );
  }

  const acceptedCount = meeting.attendees.filter((a) => a.response === 'accepted').length;
  const hasQuorum = acceptedCount >= meeting.quorumRequired;
  const totalDuration = meeting.agendaItems.reduce((sum, item) => sum + item.estimatedDuration, 0);

  const handleStartMeeting = () => {
    setMeetingOverride({ ...meeting, status: 'active', actualStart: Timestamp.now() });
  };

  const handleEndMeeting = async () => {
    setMeetingOverride({ ...meeting, status: 'completed', actualEnd: Timestamp.now() });
    // Generate minutes
    setIsGeneratingMinutes(true);
    // Simulate API call
    setTimeout(() => {
      setIsGeneratingMinutes(false);
      setActiveTab('minutes');
    }, 2000);
  };

  const handleAgendaUpdate = (items: typeof meeting.agendaItems) => {
    setMeetingOverride({ ...meeting, agendaItems: items });
  };

  const handleDuplicateMeeting = () => {
    // Navigate to new meeting page with duplicated data as query params
    const params = new URLSearchParams({
      duplicate: meeting.id,
      title: `${meeting.title} (Copy)`,
      type: meeting.meetingType,
    });
    router.push(`/dashboard/${tenantId}/meetings/new?${params.toString()}`);
  };

  const handleCancelMeeting = () => {
    setMeetingOverride({ ...meeting, status: 'cancelled' });
  };

  const handleExportPDF = async () => {
    // Trigger browser print as a simple PDF export
    window.print();
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/dashboard/${tenantId}/meetings`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Meetings
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Badge className={getMeetingStatusColor(meeting.status)}>
                {getStatusLabel(meeting.status)}
              </Badge>
              {meeting.status === 'active' && (
                <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              )}
              {!hasQuorum && meeting.status !== 'completed' && (
                <Badge variant="warning">No Quorum</Badge>
              )}
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{meeting.title}</h1>
            {meeting.description && (
              <p className="text-muted-foreground mt-1 max-w-2xl">{meeting.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {meeting.status === 'scheduled' && (
              <Button onClick={handleStartMeeting} className="gap-2">
                <Play className="h-4 w-4" />
                Start Meeting
              </Button>
            )}
            {meeting.status === 'active' && (
              <Button onClick={handleEndMeeting} variant="destructive" className="gap-2">
                <CheckCircle className="h-4 w-4" />
                End Meeting
              </Button>
            )}
            {(meeting.status === 'draft' || meeting.status === 'scheduled') && (
              <Button
                variant="outline"
                onClick={() => setActiveTab('agenda')}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
            {(meeting.status === 'scheduled' || meeting.status === 'draft') && (
              <CalendarActions
                meeting={{
                  id: meeting.id,
                  tenantId: meeting.tenantId,
                  title: meeting.title,
                  description: meeting.description,
                  meetingType: meeting.meetingType,
                  scheduledStart: meeting.scheduledStart.toDate(),
                  scheduledEnd: meeting.scheduledEnd.toDate(),
                  timezone: meeting.timezone,
                  location: meeting.location,
                  attendees: meeting.attendees.map((a) => ({
                    name: a.displayName,
                    role: a.role,
                  })),
                }}
                meetingUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/dashboard/${tenantId}/meetings/${meetingId}`}
              />
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDuplicateMeeting}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate Meeting
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF}>
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </DropdownMenuItem>
                {meeting.status !== 'cancelled' && meeting.status !== 'completed' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleCancelMeeting} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Cancel Meeting
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Meeting Info Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-medium">{formatDate(meeting.scheduledStart.toDate())}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Time</p>
                <p className="font-medium">{formatMeetingTime(meeting.scheduledStart, meeting.scheduledEnd)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {meeting.location.type === 'virtual' ? (
                <Video className="h-5 w-5 text-muted-foreground" />
              ) : (
                <MapPin className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="font-medium">
                  {meeting.location.type === 'virtual'
                    ? meeting.location.videoConferencePlatform || 'Video Call'
                    : meeting.location.room || meeting.location.address}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Attendees</p>
                <p className="font-medium">
                  {acceptedCount}/{meeting.attendees.length} confirmed
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="agenda">Agenda</TabsTrigger>
          <TabsTrigger value="attendees">Attendees</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="minutes">Minutes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Agenda Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Agenda Summary</CardTitle>
                <CardDescription>
                  {meeting.agendaItems.length} items · {formatDuration(totalDuration)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {meeting.agendaItems.slice(0, 5).map((item, index) => (
                    <div
                      key={item.id}
                      className={cn(
                        'flex items-center justify-between p-2 rounded',
                        item.isConfidential && 'bg-amber-50'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground w-6">
                          {index + 1}.
                        </span>
                        <span className="text-sm">{item.title}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {item.type}
                      </Badge>
                    </div>
                  ))}
                  {meeting.agendaItems.length > 5 && (
                    <p className="text-sm text-muted-foreground text-center">
                      +{meeting.agendaItems.length - 5} more items
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => setActiveTab('agenda')}
                >
                  View Full Agenda
                </Button>
              </CardContent>
            </Card>

            {/* Attendees Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Attendees</CardTitle>
                <CardDescription>
                  Quorum: {meeting.quorumRequired} required · {acceptedCount} confirmed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {meeting.attendees.map((attendee) => (
                    <div key={attendee.memberId} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <UserAvatar name={attendee.displayName} size="sm" />
                        <div>
                          <p className="text-sm font-medium">{attendee.displayName}</p>
                          <p className="text-xs text-muted-foreground capitalize">{attendee.role}</p>
                        </div>
                      </div>
                      {getResponseIcon(attendee.response)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Video Conference */}
            {meeting.location.videoConferenceUrl && (
              <Card>
                <CardHeader>
                  <CardTitle>Video Conference</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <a
                      href={meeting.location.videoConferenceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Video className="h-4 w-4 mr-2" />
                      Join {meeting.location.videoConferencePlatform || 'Meeting'}
                    </a>
                  </Button>
                  {meeting.location.dialInNumber && (
                    <div className="mt-4 text-sm text-muted-foreground">
                      <p>Dial-in: {meeting.location.dialInNumber}</p>
                      {meeting.location.dialInPin && <p>PIN: {meeting.location.dialInPin}</p>}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Documents */}
            <Card>
              <CardHeader>
                <CardTitle>Documents</CardTitle>
                <CardDescription>{meeting.documentIds.length} attached files</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {meeting.documentIds.map((docId, index) => (
                    <div
                      key={docId}
                      className="flex items-center justify-between p-2 rounded border hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Document {index + 1}</span>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => setActiveTab('documents')}
                >
                  Manage Documents
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="agenda" className="mt-6">
          <AgendaBuilder
            items={meeting.agendaItems}
            members={members}
            startTime={meeting.scheduledStart.toDate()}
            isLocked={meeting.agendaLocked}
            onChange={handleAgendaUpdate}
          />
        </TabsContent>

        <TabsContent value="attendees" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Meeting Attendees</CardTitle>
                  <CardDescription>
                    {acceptedCount} of {meeting.attendees.length} confirmed · Quorum: {meeting.quorumRequired}
                  </CardDescription>
                </div>
                <Button variant="outline">
                  <Users className="h-4 w-4 mr-2" />
                  Invite Attendee
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {meeting.attendees.map((attendee) => (
                  <div
                    key={attendee.memberId}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div className="flex items-center gap-4">
                      <UserAvatar name={attendee.displayName} size="md" />
                      <div>
                        <p className="font-medium">{attendee.displayName}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="outline" className="capitalize">
                            {attendee.role}
                          </Badge>
                          {attendee.hasVotingRights && (
                            <span className="text-green-600">Voting rights</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {getResponseIcon(attendee.response)}
                        <span className="text-sm capitalize">{attendee.response}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Meeting Documents</CardTitle>
                  <CardDescription>
                    Board pack and supporting materials
                  </CardDescription>
                </div>
                <Button>
                  <FileText className="h-4 w-4 mr-2" />
                  Upload Document
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {meeting.documentIds.map((docId, index) => (
                  <div
                    key={docId}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-blue-500" />
                      <div>
                        <p className="font-medium">Document {index + 1}</p>
                        <p className="text-sm text-muted-foreground">PDF · 2.4 MB</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="minutes" className="mt-6">
          {isGeneratingMinutes ? (
            <Card className="p-12 text-center">
              <Sparkles className="h-12 w-12 mx-auto text-primary animate-pulse mb-4" />
              <h3 className="text-lg font-semibold mb-2">Generating Meeting Minutes</h3>
              <p className="text-muted-foreground">
                AI is analyzing the meeting and creating minutes...
              </p>
            </Card>
          ) : meeting.status === 'completed' && meeting.minutes ? (
            <MeetingMinutesEditor
              minutes={meeting.minutes}
              onUpdate={(minutes) => setMeetingOverride({ ...meeting, minutes })}
              onSign={async () => {}}
              onDistribute={async () => {}}
              currentUserId={meeting.attendees[0]?.memberId || ''}
              canEdit={true}
            />
          ) : meeting.status === 'completed' ? (
            <Card className="p-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Generating Minutes...</h3>
              <p className="text-muted-foreground">
                Minutes are being generated for this completed meeting.
              </p>
            </Card>
          ) : (
            <Card className="p-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Minutes Not Available</h3>
              <p className="text-muted-foreground">
                Meeting minutes will be generated after the meeting is completed.
              </p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
