'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
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
  Share,
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
import { cn, formatDate, formatDuration, getMeetingStatusColor } from '@/lib/utils';
import type { Meeting, Member } from '@/types/schema';
import { Timestamp } from 'firebase/firestore';

// Mock data
const mockMeeting: Meeting = {
  id: '1',
  tenantId: 'tenant1',
  title: 'Q4 Board Meeting',
  description: 'Quarterly board meeting to review Q4 results and approve 2025 budget',
  meetingType: 'ordinary',
  status: 'scheduled',
  scheduledStart: Timestamp.fromDate(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)),
  scheduledEnd: Timestamp.fromDate(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000)),
  timezone: 'Europe/Stockholm',
  location: {
    type: 'hybrid',
    address: 'Stureplan 4, Stockholm',
    room: 'Board Room',
    videoConferenceUrl: 'https://teams.microsoft.com/meet/123',
    videoConferencePlatform: 'teams',
  },
  attendees: [
    { memberId: '1', userId: '1', displayName: 'Anna Lindqvist', role: 'chair', invitedAt: Timestamp.now(), response: 'accepted', hasVotingRights: true },
    { memberId: '2', userId: '2', displayName: 'Erik Johansson', role: 'secretary', invitedAt: Timestamp.now(), response: 'accepted', hasVotingRights: true },
    { memberId: '3', userId: '3', displayName: 'Maria Svensson', role: 'director', invitedAt: Timestamp.now(), response: 'pending', hasVotingRights: true },
    { memberId: '4', userId: '4', displayName: 'Karl Nilsson', role: 'adjuster', invitedAt: Timestamp.now(), response: 'accepted', hasVotingRights: true },
    { memberId: '5', userId: '5', displayName: 'Lisa Andersson', role: 'director', invitedAt: Timestamp.now(), response: 'declined', hasVotingRights: true },
  ],
  quorumRequired: 3,
  agendaItems: [
    { id: '1', orderIndex: 0, title: 'Opening of the meeting', type: 'formality', estimatedDuration: 5, documentIds: [], conflictKeywords: [], recusedMemberIds: [], actionItems: [], isConfidential: false, isCompleted: false },
    { id: '2', orderIndex: 1, title: 'Election of adjuster', type: 'formality', estimatedDuration: 5, documentIds: [], conflictKeywords: [], recusedMemberIds: [], actionItems: [], isConfidential: false, isCompleted: false },
    { id: '3', orderIndex: 2, title: 'Approval of previous meeting minutes', type: 'formality', estimatedDuration: 10, documentIds: ['doc1'], conflictKeywords: [], recusedMemberIds: [], actionItems: [], isConfidential: false, isCompleted: false },
    { id: '4', orderIndex: 3, title: 'Q4 Financial Review', description: 'Presentation of Q4 financial results including revenue, EBITDA, and cash position', type: 'information', estimatedDuration: 30, presenterId: '2', presenterName: 'Erik Johansson', documentIds: ['doc2'], conflictKeywords: [], recusedMemberIds: [], actionItems: [], isConfidential: false, isCompleted: false },
    { id: '5', orderIndex: 4, title: 'Budget Approval 2025', description: 'Review and approve the proposed budget for fiscal year 2025', type: 'decision', estimatedDuration: 45, documentIds: ['doc3'], conflictKeywords: [], recusedMemberIds: [], actionItems: [], isConfidential: false, isCompleted: false },
    { id: '6', orderIndex: 5, title: 'Acquisition of TechCorp AB', description: 'Discussion and decision on proposed acquisition', type: 'decision', estimatedDuration: 60, documentIds: ['doc4'], conflictKeywords: ['TechCorp', 'acquisition'], recusedMemberIds: [], actionItems: [], isConfidential: true, isCompleted: false },
    { id: '7', orderIndex: 6, title: 'Any other business', type: 'discussion', estimatedDuration: 15, documentIds: [], conflictKeywords: [], recusedMemberIds: [], actionItems: [], isConfidential: false, isCompleted: false },
    { id: '8', orderIndex: 7, title: 'Closing of the meeting', type: 'formality', estimatedDuration: 5, documentIds: [], conflictKeywords: [], recusedMemberIds: [], actionItems: [], isConfidential: false, isCompleted: false },
  ],
  agendaLocked: false,
  documentIds: ['doc1', 'doc2', 'doc3', 'doc4'],
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
  createdBy: '1',
  lastModifiedBy: '1',
};

const mockMembers: Member[] = [
  { id: '1', tenantId: 'tenant1', userId: '1', role: 'chair', title: 'Chair', isActive: true, conflicts: [], permissions: { canCreateMeetings: true, canManageMembers: true, canAccessFinancials: true, canSignDocuments: true, canManageDocuments: true }, joinedAt: Timestamp.now() },
  { id: '2', tenantId: 'tenant1', userId: '2', role: 'secretary', title: 'Secretary', isActive: true, conflicts: [], permissions: { canCreateMeetings: true, canManageMembers: false, canAccessFinancials: true, canSignDocuments: true, canManageDocuments: true }, joinedAt: Timestamp.now() },
  { id: '3', tenantId: 'tenant1', userId: '3', role: 'director', title: 'Board Member', isActive: true, conflicts: [], permissions: { canCreateMeetings: false, canManageMembers: false, canAccessFinancials: true, canSignDocuments: true, canManageDocuments: false }, joinedAt: Timestamp.now() },
  { id: '4', tenantId: 'tenant1', userId: '4', role: 'director', title: 'Board Member', isActive: true, conflicts: [{ id: '1', entityName: 'TechCorp AB', entityType: 'company', relationship: 'Board Member', isActive: true, declaredAt: Timestamp.now() }], permissions: { canCreateMeetings: false, canManageMembers: false, canAccessFinancials: true, canSignDocuments: true, canManageDocuments: false }, joinedAt: Timestamp.now() },
  { id: '5', tenantId: 'tenant1', userId: '5', role: 'director', title: 'External Director', isActive: true, conflicts: [], permissions: { canCreateMeetings: false, canManageMembers: false, canAccessFinancials: true, canSignDocuments: true, canManageDocuments: false }, joinedAt: Timestamp.now() },
];

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
  const tenantId = params.tenantId as string;
  const meetingId = params.meetingId as string;

  const [meeting, setMeeting] = useState<Meeting>(mockMeeting);
  const [activeTab, setActiveTab] = useState('overview');
  const [isGeneratingMinutes, setIsGeneratingMinutes] = useState(false);

  const acceptedCount = meeting.attendees.filter((a) => a.response === 'accepted').length;
  const hasQuorum = acceptedCount >= meeting.quorumRequired;
  const totalDuration = meeting.agendaItems.reduce((sum, item) => sum + item.estimatedDuration, 0);

  const handleStartMeeting = () => {
    setMeeting({ ...meeting, status: 'active', actualStart: Timestamp.now() });
  };

  const handleEndMeeting = async () => {
    setMeeting({ ...meeting, status: 'completed', actualEnd: Timestamp.now() });
    // Generate minutes
    setIsGeneratingMinutes(true);
    // Simulate API call
    setTimeout(() => {
      setIsGeneratingMinutes(false);
      setActiveTab('minutes');
    }, 2000);
  };

  const handleAgendaUpdate = (items: typeof meeting.agendaItems) => {
    setMeeting({ ...meeting, agendaItems: items });
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
              <Link href={`/dashboard/${tenantId}/meetings/${meetingId}/edit`}>
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </Link>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate Meeting
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Share className="h-4 w-4 mr-2" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Cancel Meeting
                </DropdownMenuItem>
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
            members={mockMembers}
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
              onUpdate={(minutes) => setMeeting({ ...meeting, minutes })}
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
