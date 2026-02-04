'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Meeting } from '@/types/schema';

interface MeetingCalendarProps {
  meetings: Meeting[];
  tenantId: string;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function MeetingCalendar({ meetings, tenantId }: MeetingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Get all days to display in the calendar grid
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  // Group meetings by date
  const meetingsByDate = useMemo(() => {
    const map = new Map<string, Meeting[]>();

    meetings.forEach((meeting) => {
      const date = meeting.scheduledStart.toDate();
      const key = format(date, 'yyyy-MM-dd');

      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(meeting);
    });

    return map;
  }, [meetings]);

  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());

  return (
    <div className="bg-card rounded-lg border">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <div className="flex">
            <Button
              variant="outline"
              size="icon"
              className="rounded-r-none"
              onClick={goToPreviousMonth}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="rounded-l-none border-l-0"
              onClick={goToNextMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 border-b">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-sm font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, index) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayMeetings = meetingsByDate.get(dateKey) || [];
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isCurrentDay = isToday(day);

          return (
            <div
              key={index}
              className={cn(
                'min-h-[120px] border-b border-r p-1',
                !isCurrentMonth && 'bg-muted/30',
                index % 7 === 6 && 'border-r-0' // Last column
              )}
            >
              {/* Day Number */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    'inline-flex h-7 w-7 items-center justify-center rounded-full text-sm',
                    isCurrentDay && 'bg-primary text-primary-foreground font-semibold',
                    !isCurrentMonth && 'text-muted-foreground'
                  )}
                >
                  {format(day, 'd')}
                </span>
                {dayMeetings.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {dayMeetings.length}
                  </Badge>
                )}
              </div>

              {/* Meetings */}
              <div className="space-y-1">
                {dayMeetings.slice(0, 3).map((meeting) => (
                  <MeetingEvent
                    key={meeting.id}
                    meeting={meeting}
                    tenantId={tenantId}
                  />
                ))}
                {dayMeetings.length > 3 && (
                  <p className="text-xs text-muted-foreground pl-1">
                    +{dayMeetings.length - 3} more
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface MeetingEventProps {
  meeting: Meeting;
  tenantId: string;
}

function MeetingEvent({ meeting, tenantId }: MeetingEventProps) {
  const statusColors: Record<Meeting['status'], string> = {
    draft: 'bg-muted text-muted-foreground',
    scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    completed: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  return (
    <Link href={`/dashboard/${tenantId}/meetings/${meeting.id}`}>
      <div
        className={cn(
          'rounded px-1.5 py-0.5 text-xs truncate cursor-pointer hover:opacity-80 transition-opacity',
          statusColors[meeting.status]
        )}
        title={meeting.title}
      >
        <span className="font-medium">
          {format(meeting.scheduledStart.toDate(), 'HH:mm')}
        </span>{' '}
        {meeting.title}
      </div>
    </Link>
  );
}

export default MeetingCalendar;
