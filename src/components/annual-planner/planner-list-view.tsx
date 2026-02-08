'use client';

/**
 * Planner List View - Table/list view of annual planner events
 *
 * Alternative view to the wheel, showing events in a sortable list.
 */

import React from 'react';
import { CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  PlannerEvent,
  PlannerRing,
  PlannerActivityType,
  PlannerLabel,
} from '@/types/annual-planner';

// ============================================================================
// TYPES
// ============================================================================

interface PlannerListViewProps {
  events: PlannerEvent[];
  rings: PlannerRing[];
  activityTypes: PlannerActivityType[];
  labels: PlannerLabel[];
  onEventClick: (event: PlannerEvent) => void;
  className?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

const MONTH_NAMES_SV = [
  'Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
  'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December',
];

function groupEventsByMonth(events: PlannerEvent[]): Map<number, PlannerEvent[]> {
  const groups = new Map<number, PlannerEvent[]>();
  const sorted = [...events].sort(
    (a, b) => a.startDate.getTime() - b.startDate.getTime()
  );

  for (const event of sorted) {
    const month = event.startDate.getMonth();
    if (!groups.has(month)) {
      groups.set(month, []);
    }
    groups.get(month)!.push(event);
  }

  return groups;
}

// ============================================================================
// EVENT ROW
// ============================================================================

interface EventRowProps {
  event: PlannerEvent;
  ring: PlannerRing | undefined;
  activity: PlannerActivityType | undefined;
  eventLabels: PlannerLabel[];
  onClick: () => void;
}

function EventRow({ event, ring, activity, eventLabels, onClick }: EventRowProps) {
  const startStr = event.startDate.toLocaleDateString('sv-SE');
  const endStr = event.endDate.toLocaleDateString('sv-SE');

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-4 w-full text-left px-4 py-3 rounded-lg hover:bg-muted transition-colors border border-transparent hover:border-border"
    >
      {/* Activity color indicator */}
      <span
        className="w-3 h-10 rounded-full flex-shrink-0"
        style={{ backgroundColor: activity?.color || '#94a3b8' }}
      />

      {/* Event info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-foreground truncate">
          {event.title}
        </p>
        <div className="flex items-center gap-3 mt-0.5">
          {ring && (
            <span className="text-xs text-muted-foreground">
              {ring.name}
            </span>
          )}
          {activity && (
            <span className="text-xs text-muted-foreground">
              {activity.name}
            </span>
          )}
        </div>
      </div>

      {/* Labels */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {eventLabels.map((label) => (
          <span
            key={label.id}
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
            style={{
              backgroundColor: label.color + '20',
              color: label.color,
            }}
          >
            {label.name}
          </span>
        ))}
      </div>

      {/* Date */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0">
        <CalendarDays className="h-3.5 w-3.5" />
        <span>{startStr}</span>
        <span>&ndash;</span>
        <span>{endStr}</span>
      </div>
    </button>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PlannerListView({
  events,
  rings,
  activityTypes,
  labels,
  onEventClick,
  className,
}: PlannerListViewProps) {
  const monthGroups = groupEventsByMonth(events);

  if (events.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
        <CalendarDays className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-1">
          Inga händelser
        </h3>
        <p className="text-sm text-muted-foreground">
          Lägg till händelser i årshjulet för att se dem här.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {Array.from(monthGroups.entries()).map(([month, monthEvents]) => (
        <div key={month}>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-2 px-4">
            {MONTH_NAMES_SV[month]}
          </h3>
          <div className="space-y-1">
            {monthEvents.map((event) => {
              const ring = rings.find((r) => r.id === event.ringId);
              const activity = activityTypes.find((a) => a.id === event.activityTypeId);
              const eventLabels = labels.filter((l) => event.labelIds.includes(l.id));

              return (
                <EventRow
                  key={event.id}
                  event={event}
                  ring={ring}
                  activity={activity}
                  eventLabels={eventLabels}
                  onClick={() => onEventClick(event)}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
