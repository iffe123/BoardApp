'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Plus,
  Search,
  Filter,
  Calendar,
  LayoutGrid,
  List,
  ChevronDown,
  Clock,
  MapPin,
  Video,
  Users,
  FileText,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { cn, formatDate, formatDuration } from '@/lib/utils';
import type { Meeting, MeetingStatus, MeetingAttendee } from '@/types/schema';
import { Timestamp } from 'firebase/firestore';

// Mock data - would come from Firestore in real app
const mockMeetings: Meeting[] = [
  {
    id: '1',
    tenantId: 'tenant1',
    title: 'Q4 Board Meeting',
    description: 'Quarterly board meeting to review Q4 results',
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
    ],
    quorumRequired: 2,
    agendaItems: [
      { id: '1', orderIndex: 0, title: 'Opening', type: 'formality', estimatedDuration: 5, documentIds: [], conflictKeywords: [], recusedMemberIds: [], actionItems: [], isConfidential: false, isCompleted: false },
      { id: '2', orderIndex: 1, title: 'Q4 Financial Review', type: 'information', estimatedDuration: 30, documentIds: [], conflictKeywords: [], recusedMemberIds: [], actionItems: [], isConfidential: false, isCompleted: false },
      { id: '3', orderIndex: 2, title: 'Budget Approval 2025', type: 'decision', estimatedDuration: 45, documentIds: [], conflictKeywords: [], recusedMemberIds: [], actionItems: [], isConfidential: false, isCompleted: false },
    ],
    agendaLocked: false,
    documentIds: ['doc1', 'doc2'],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    createdBy: '1',
    lastModifiedBy: '1',
  },
  {
    id: '2',
    tenantId: 'tenant1',
    title: 'Audit Committee Meeting',
    description: 'Review internal audit findings',
    meetingType: 'ordinary',
    status: 'scheduled',
    scheduledStart: Timestamp.fromDate(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)),
    scheduledEnd: Timestamp.fromDate(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 1.5 * 60 * 60 * 1000)),
    timezone: 'Europe/Stockholm',
    location: {
      type: 'virtual',
      videoConferenceUrl: 'https://zoom.us/j/123456',
      videoConferencePlatform: 'zoom',
    },
    attendees: [
      { memberId: '1', userId: '1', displayName: 'Anna Lindqvist', role: 'chair', invitedAt: Timestamp.now(), response: 'accepted', hasVotingRights: true },
      { memberId: '4', userId: '4', displayName: 'Karl Nilsson', role: 'director', invitedAt: Timestamp.now(), response: 'accepted', hasVotingRights: true },
    ],
    quorumRequired: 2,
    agendaItems: [
      { id: '1', orderIndex: 0, title: 'Opening', type: 'formality', estimatedDuration: 5, documentIds: [], conflictKeywords: [], recusedMemberIds: [], actionItems: [], isConfidential: false, isCompleted: false },
      { id: '2', orderIndex: 1, title: 'Internal Audit Report', type: 'discussion', estimatedDuration: 60, documentIds: [], conflictKeywords: [], recusedMemberIds: [], actionItems: [], isConfidential: true, isCompleted: false },
    ],
    agendaLocked: false,
    documentIds: [],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    createdBy: '1',
    lastModifiedBy: '1',
  },
  {
    id: '3',
    tenantId: 'tenant1',
    title: 'November Board Meeting',
    description: 'Monthly board meeting',
    meetingType: 'ordinary',
    status: 'completed',
    scheduledStart: Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
    scheduledEnd: Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000)),
    actualStart: Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
    actualEnd: Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 1.5 * 60 * 60 * 1000)),
    timezone: 'Europe/Stockholm',
    location: {
      type: 'physical',
      address: 'Stureplan 4, Stockholm',
      room: 'Board Room',
    },
    attendees: [
      { memberId: '1', userId: '1', displayName: 'Anna Lindqvist', role: 'chair', invitedAt: Timestamp.now(), response: 'accepted', attendanceStatus: 'present', hasVotingRights: true },
      { memberId: '2', userId: '2', displayName: 'Erik Johansson', role: 'secretary', invitedAt: Timestamp.now(), response: 'accepted', attendanceStatus: 'present', hasVotingRights: true },
      { memberId: '3', userId: '3', displayName: 'Maria Svensson', role: 'director', invitedAt: Timestamp.now(), response: 'accepted', attendanceStatus: 'present', hasVotingRights: true },
    ],
    quorumRequired: 2,
    agendaItems: [
      { id: '1', orderIndex: 0, title: 'Opening', type: 'formality', estimatedDuration: 5, documentIds: [], conflictKeywords: [], recusedMemberIds: [], actionItems: [], isConfidential: false, isCompleted: true },
      { id: '2', orderIndex: 1, title: 'Previous Minutes Approval', type: 'formality', estimatedDuration: 10, documentIds: [], conflictKeywords: [], recusedMemberIds: [], actionItems: [], isConfidential: false, isCompleted: true },
    ],
    agendaLocked: true,
    documentIds: ['doc3'],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    createdBy: '1',
    lastModifiedBy: '1',
  },
];

type ViewMode = 'grid' | 'list';
type FilterStatus = 'all' | MeetingStatus;

function formatMeetingTime(start: Timestamp, end: Timestamp): string {
  const startDate = start.toDate();
  const endDate = end.toDate();
  const timeFormat: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
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

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'bg-white/10 text-white/50',
    scheduled: 'bg-blue-500/10 text-blue-400',
    active: 'bg-emerald-500/10 text-emerald-400',
    completed: 'bg-white/10 text-white/50',
    cancelled: 'bg-red-500/10 text-red-400',
  };
  return colors[status] || 'bg-white/10 text-white/50';
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

interface MeetingCardProps {
  meeting: Meeting;
  tenantId: string;
}

function MeetingCard({ meeting, tenantId }: MeetingCardProps) {
  const attendeesAccepted = meeting.attendees.filter((a: MeetingAttendee) => a.response === 'accepted').length;
  const hasQuorum = attendeesAccepted >= meeting.quorumRequired;

  return (
    <Link href={`/dashboard/${tenantId}/meetings/${meeting.id}`}>
      <div className={cn(
        'rounded-xl bg-white/[0.02] p-5 hover:bg-white/[0.04] transition-colors',
        meeting.status === 'active' && 'ring-1 ring-emerald-500/50'
      )}>
        <div className="flex items-start justify-between mb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 text-xs rounded-md ${getStatusColor(meeting.status)}`}>
                {getStatusLabel(meeting.status)}
              </span>
              {meeting.status === 'active' && (
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </div>
            <h3 className="font-semibold">{meeting.title}</h3>
            <p className="text-sm text-white/40">{getMeetingTypeLabel(meeting.meetingType)}</p>
          </div>
          <ChevronRight className="h-5 w-5 text-white/20" />
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-white/50">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(meeting.scheduledStart.toDate())}</span>
            </div>
            <div className="flex items-center gap-2 text-white/50">
              <Clock className="h-4 w-4" />
              <span>{formatMeetingTime(meeting.scheduledStart, meeting.scheduledEnd)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-white/50">
            {meeting.location.type === 'virtual' ? (
              <>
                <Video className="h-4 w-4" />
                <span>{meeting.location.videoConferencePlatform || 'Video Conference'}</span>
              </>
            ) : meeting.location.type === 'hybrid' ? (
              <>
                <Video className="h-4 w-4" />
                <MapPin className="h-4 w-4" />
                <span>Hybrid - {meeting.location.address || meeting.location.room}</span>
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4" />
                <span>{meeting.location.address || meeting.location.room || 'TBD'}</span>
              </>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-white/40" />
              <div className="flex -space-x-2">
                {meeting.attendees.slice(0, 4).map((attendee: MeetingAttendee) => (
                  <div
                    key={attendee.memberId}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[10px] font-medium border border-[#0a0a0a]"
                  >
                    {attendee.displayName.charAt(0)}
                  </div>
                ))}
                {meeting.attendees.length > 4 && (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[10px] font-medium border border-[#0a0a0a]">
                    +{meeting.attendees.length - 4}
                  </div>
                )}
              </div>
              <span className="text-xs text-white/40">{attendeesAccepted}/{meeting.attendees.length}</span>
            </div>

            {!hasQuorum && meeting.status !== 'completed' && meeting.status !== 'cancelled' && (
              <span className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-md bg-amber-500/10 text-amber-400">
                <AlertCircle className="h-3 w-3" />
                No quorum
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-white/30 pt-2 border-t border-white/5">
            <div className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              <span>{meeting.agendaItems.length} agenda items</span>
            </div>
            {meeting.documentIds.length > 0 && (
              <div className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                <span>{meeting.documentIds.length} documents</span>
              </div>
            )}
            <span>
              {formatDuration(meeting.agendaItems.reduce((sum, item) => sum + item.estimatedDuration, 0))}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function MeetingsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);

  // Filter meetings
  const filteredMeetings = mockMeetings.filter((meeting) => {
    const matchesStatus = filterStatus === 'all' || meeting.status === filterStatus;
    const matchesSearch =
      searchQuery === '' ||
      meeting.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meeting.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Group meetings by status for summary
  const meetingsByStatus = mockMeetings.reduce(
    (acc, meeting) => {
      acc[meeting.status] = (acc[meeting.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const upcomingMeetings = filteredMeetings.filter(
    (m) => m.status === 'scheduled' || m.status === 'draft'
  );
  const pastMeetings = filteredMeetings.filter(
    (m) => m.status === 'completed' || m.status === 'cancelled'
  );

  return (
    <div className="p-8 text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meetings</h1>
          <p className="text-white/50 mt-1">
            Schedule and manage board meetings
          </p>
        </div>
        <Link href={`/dashboard/${tenantId}/meetings/new`}>
          <button className="flex items-center gap-2 px-4 py-2 bg-white text-black font-medium rounded-lg hover:bg-white/90 transition-colors">
            <Plus className="h-4 w-4" />
            New Meeting
          </button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-10">
        <div className="p-6 rounded-xl bg-white/[0.02]">
          <p className="text-sm text-white/40">Scheduled</p>
          <p className="text-3xl font-bold mt-1">{meetingsByStatus['scheduled'] || 0}</p>
        </div>
        <div className="p-6 rounded-xl bg-emerald-500/10">
          <p className="text-sm text-emerald-400">In Progress</p>
          <p className="text-3xl font-bold mt-1 text-emerald-400">{meetingsByStatus['active'] || 0}</p>
        </div>
        <div className="p-6 rounded-xl bg-white/[0.02]">
          <p className="text-sm text-white/40">Completed</p>
          <p className="text-3xl font-bold mt-1">{meetingsByStatus['completed'] || 0}</p>
        </div>
        <div className="p-6 rounded-xl bg-white/[0.02]">
          <p className="text-sm text-white/40">Draft</p>
          <p className="text-3xl font-bold mt-1 text-white/50">{meetingsByStatus['draft'] || 0}</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <input
            type="text"
            placeholder="Search meetings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
          />
        </div>

        <div className="flex gap-2">
          <div className="relative">
            <button
              onClick={() => setFilterOpen(!filterOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/70 hover:bg-white/10 transition-colors"
            >
              <Filter className="h-4 w-4" />
              {filterStatus === 'all' ? 'All Status' : getStatusLabel(filterStatus)}
              <ChevronDown className="h-4 w-4" />
            </button>

            {filterOpen && (
              <div className="absolute top-full left-0 mt-1 py-1 bg-[#141414] border border-white/10 rounded-lg shadow-xl z-50 min-w-[140px]">
                {['all', 'scheduled', 'active', 'completed', 'draft', 'cancelled'].map((status) => (
                  <button
                    key={status}
                    onClick={() => { setFilterStatus(status as FilterStatus); setFilterOpen(false); }}
                    className="w-full px-3 py-2 text-sm text-left text-white/70 hover:bg-white/5"
                  >
                    {status === 'all' ? 'All' : getStatusLabel(status)}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex bg-white/5 border border-white/10 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2 transition-colors',
                viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-2 transition-colors',
                viewMode === 'list' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
              )}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredMeetings.length === 0 && (
        <div className="rounded-xl bg-white/[0.02] p-12 text-center">
          <Calendar className="h-12 w-12 mx-auto text-white/20 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No meetings found</h3>
          <p className="text-white/50 mb-4">
            {searchQuery || filterStatus !== 'all'
              ? 'Try adjusting your filters or search query'
              : 'Get started by scheduling your first board meeting'}
          </p>
          {!searchQuery && filterStatus === 'all' && (
            <Link href={`/dashboard/${tenantId}/meetings/new`}>
              <button className="flex items-center gap-2 px-4 py-2 bg-white text-black font-medium rounded-lg hover:bg-white/90 transition-colors mx-auto">
                <Plus className="h-4 w-4" />
                Schedule Meeting
              </button>
            </Link>
          )}
        </div>
      )}

      {/* Meeting Lists */}
      {filteredMeetings.length > 0 && (
        <div className="space-y-8">
          {/* Upcoming Meetings */}
          {upcomingMeetings.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-4">Upcoming Meetings</h2>
              <div className={cn(
                viewMode === 'grid'
                  ? 'grid gap-4 md:grid-cols-2 lg:grid-cols-3'
                  : 'space-y-4'
              )}>
                {upcomingMeetings.map((meeting) => (
                  <MeetingCard key={meeting.id} meeting={meeting} tenantId={tenantId} />
                ))}
              </div>
            </section>
          )}

          {/* Past Meetings */}
          {pastMeetings.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-4">Past Meetings</h2>
              <div className={cn(
                viewMode === 'grid'
                  ? 'grid gap-4 md:grid-cols-2 lg:grid-cols-3'
                  : 'space-y-4'
              )}>
                {pastMeetings.map((meeting) => (
                  <MeetingCard key={meeting.id} meeting={meeting} tenantId={tenantId} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
