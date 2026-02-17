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
  CalendarDays,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { MeetingCard } from '@/components/meetings/meeting-card';
import { MeetingCalendar } from '@/components/meetings/meeting-calendar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { MeetingStatus } from '@/types/schema';
import { useMeetings } from '@/hooks/use-firestore';

type ViewMode = 'grid' | 'list' | 'calendar';
type FilterStatus = 'all' | MeetingStatus;

export default function MeetingsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: meetings = [], isLoading } = useMeetings(tenantId);

  // Filter meetings
  const filteredMeetings = meetings.filter((meeting) => {
    const matchesStatus = filterStatus === 'all' || meeting.status === filterStatus;
    const matchesSearch =
      searchQuery === '' ||
      meeting.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meeting.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Group meetings by status for summary
  const meetingsByStatus = meetings.reduce(
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
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meetings</h1>
          <p className="text-muted-foreground mt-1">
            Schedule and manage board meetings
          </p>
        </div>
        <Link href={`/dashboard/${tenantId}/meetings/new`}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Meeting
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Scheduled</div>
            <div className="text-2xl font-bold">{meetingsByStatus['scheduled'] || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">In Progress</div>
            <div className="text-2xl font-bold text-green-600">{meetingsByStatus['active'] || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Completed</div>
            <div className="text-2xl font-bold">{meetingsByStatus['completed'] || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Draft</div>
            <div className="text-2xl font-bold text-muted-foreground">{meetingsByStatus['draft'] || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search meetings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                {filterStatus === 'all' ? 'All Status' : filterStatus}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setFilterStatus('all')}>
                All
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus('scheduled')}>
                Scheduled
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus('active')}>
                In Progress
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus('completed')}>
                Completed
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus('draft')}>
                Draft
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus('cancelled')}>
                Cancelled
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
              title="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
              className="rounded-none border-l"
              title="List view"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('calendar')}
              className="rounded-l-none border-l"
              title="Calendar view"
            >
              <CalendarDays className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State (only for grid/list view) */}
      {!isLoading && viewMode !== 'calendar' && filteredMeetings.length === 0 && (
        <Card className="p-12 text-center">
          <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No meetings found</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery || filterStatus !== 'all'
              ? 'Try adjusting your filters or search query'
              : 'Get started by scheduling your first board meeting'}
          </p>
          {!searchQuery && filterStatus === 'all' && (
            <Link href={`/dashboard/${tenantId}/meetings/new`}>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Schedule Meeting
              </Button>
            </Link>
          )}
        </Card>
      )}

      {/* Calendar View */}
      {!isLoading && viewMode === 'calendar' && (
        <MeetingCalendar meetings={meetings} tenantId={tenantId} />
      )}

      {/* Meeting Lists (Grid/List View) */}
      {!isLoading && viewMode !== 'calendar' && filteredMeetings.length > 0 && (
        <div className="space-y-8">
          {/* Upcoming Meetings */}
          {upcomingMeetings.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold tracking-tight mb-4">Upcoming Meetings</h2>
              <div
                className={cn(
                  viewMode === 'grid'
                    ? 'grid gap-4 md:grid-cols-2 lg:grid-cols-3'
                    : 'space-y-4'
                )}
              >
                {upcomingMeetings.map((meeting) => (
                  <MeetingCard
                    key={meeting.id}
                    meeting={meeting}
                    tenantId={tenantId}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Past Meetings */}
          {pastMeetings.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold tracking-tight mb-4">Past Meetings</h2>
              <div
                className={cn(
                  viewMode === 'grid'
                    ? 'grid gap-4 md:grid-cols-2 lg:grid-cols-3'
                    : 'space-y-4'
                )}
              >
                {pastMeetings.map((meeting) => (
                  <MeetingCard
                    key={meeting.id}
                    meeting={meeting}
                    tenantId={tenantId}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
