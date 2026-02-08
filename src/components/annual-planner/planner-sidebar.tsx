'use client';

/**
 * Planner Sidebar - Filter and control panel for the annual wheel
 *
 * Provides filtering by rings, activity types, and labels, matching
 * the Plandisc left panel design.
 */

import React from 'react';
import { Search, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type {
  PlannerRing,
  PlannerActivityType,
  PlannerLabel,
  PlannerEvent,
} from '@/types/annual-planner';

// ============================================================================
// SECTION HEADER
// ============================================================================

interface SectionHeaderProps {
  title: string;
  onShowAll?: () => void;
  onHideAll?: () => void;
}

function SectionHeader({ title, onShowAll, onHideAll }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </h3>
      {onShowAll && onHideAll && (
        <div className="flex items-center gap-1 text-xs text-primary">
          <button
            onClick={onShowAll}
            className="hover:underline font-medium"
          >
            Alla
          </button>
          <span className="text-muted-foreground">|</span>
          <button
            onClick={onHideAll}
            className="hover:underline font-medium"
          >
            Ingen
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// RING ITEM
// ============================================================================

interface RingItemProps {
  ring: PlannerRing;
  onToggle: (id: string) => void;
}

function RingItem({ ring, onToggle }: RingItemProps) {
  return (
    <button
      onClick={() => onToggle(ring.id)}
      className={cn(
        'flex items-center gap-3 w-full text-left py-1.5 px-1 rounded-md transition-colors hover:bg-muted',
        !ring.visible && 'opacity-50'
      )}
    >
      <span
        className="inline-block w-6 h-6 rounded-full border-[3px] flex-shrink-0"
        style={{ borderColor: ring.color }}
      />
      <span className="text-sm font-medium text-foreground truncate">
        {ring.name}
      </span>
      {!ring.visible && (
        <EyeOff className="h-3.5 w-3.5 text-muted-foreground ml-auto flex-shrink-0" />
      )}
    </button>
  );
}

// ============================================================================
// ACTIVITY ITEM
// ============================================================================

interface ActivityItemProps {
  activity: PlannerActivityType;
  count: number;
  onToggle: (id: string) => void;
}

function ActivityItem({ activity, count, onToggle }: ActivityItemProps) {
  return (
    <button
      onClick={() => onToggle(activity.id)}
      className={cn(
        'flex items-center gap-3 w-full text-left py-1.5 px-1 rounded-md transition-colors hover:bg-muted',
        !activity.visible && 'opacity-50'
      )}
    >
      <span
        className="inline-block w-5 h-5 rounded flex-shrink-0"
        style={{ backgroundColor: activity.color }}
      />
      <span className="text-sm font-medium text-foreground truncate flex-1">
        {activity.name}
      </span>
      <span className="text-xs font-semibold text-muted-foreground bg-muted rounded-full px-2 py-0.5 flex-shrink-0">
        {count}
      </span>
    </button>
  );
}

// ============================================================================
// LABEL ITEM
// ============================================================================

interface LabelItemProps {
  label: PlannerLabel;
  count: number;
  isActive: boolean;
  onToggle: (id: string) => void;
}

function LabelItem({ label, count, isActive, onToggle }: LabelItemProps) {
  return (
    <button
      onClick={() => onToggle(label.id)}
      className={cn(
        'flex items-center gap-3 w-full text-left py-1.5 px-1 rounded-md transition-colors hover:bg-muted',
        !isActive && 'opacity-50'
      )}
    >
      <span
        className="inline-block w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center"
        style={{ backgroundColor: label.color + '30' }}
      >
        <span
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: label.color }}
        />
      </span>
      <span className="text-sm font-medium text-foreground truncate flex-1">
        {label.name}
      </span>
      <span className="text-xs font-semibold text-muted-foreground bg-muted rounded-full px-2 py-0.5 flex-shrink-0">
        {count}
      </span>
    </button>
  );
}

// ============================================================================
// MAIN SIDEBAR
// ============================================================================

interface PlannerSidebarProps {
  rings: PlannerRing[];
  activityTypes: PlannerActivityType[];
  labels: PlannerLabel[];
  events: PlannerEvent[];
  activeLabels: Set<string>;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onToggleRing: (id: string) => void;
  onShowAllRings: () => void;
  onHideAllRings: () => void;
  onToggleActivity: (id: string) => void;
  onShowAllActivities: () => void;
  onHideAllActivities: () => void;
  onToggleLabel: (id: string) => void;
  onShowAllLabels: () => void;
  onHideAllLabels: () => void;
  className?: string;
}

export function PlannerSidebar({
  rings,
  activityTypes,
  labels,
  events,
  activeLabels,
  searchQuery,
  onSearchChange,
  onToggleRing,
  onShowAllRings,
  onHideAllRings,
  onToggleActivity,
  onShowAllActivities,
  onHideAllActivities,
  onToggleLabel,
  onShowAllLabels,
  onHideAllLabels,
  className,
}: PlannerSidebarProps) {
  // Count events per activity type
  const activityCounts = activityTypes.reduce<Record<string, number>>((acc, at) => {
    acc[at.id] = events.filter((e) => e.activityTypeId === at.id).length;
    return acc;
  }, {});

  // Count events per label
  const labelCounts = labels.reduce<Record<string, number>>((acc, l) => {
    acc[l.id] = events.filter((e) => e.labelIds.includes(l.id)).length;
    return acc;
  }, {});

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Sök"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Rings */}
      <div className="mb-6">
        <SectionHeader
          title="Ringar"
          onShowAll={onShowAllRings}
          onHideAll={onHideAllRings}
        />
        <div className="space-y-0.5">
          {rings.map((ring) => (
            <RingItem key={ring.id} ring={ring} onToggle={onToggleRing} />
          ))}
        </div>
      </div>

      {/* Activities */}
      <div className="mb-6">
        <SectionHeader
          title="Aktiviteter"
          onShowAll={onShowAllActivities}
          onHideAll={onHideAllActivities}
        />
        <div className="space-y-0.5">
          {activityTypes.map((activity) => (
            <ActivityItem
              key={activity.id}
              activity={activity}
              count={activityCounts[activity.id] || 0}
              onToggle={onToggleActivity}
            />
          ))}
        </div>
      </div>

      {/* Labels */}
      <div>
        <SectionHeader
          title="Etiketter"
          onShowAll={onShowAllLabels}
          onHideAll={onHideAllLabels}
        />
        <div className="space-y-0.5">
          {labels.map((label) => (
            <LabelItem
              key={label.id}
              label={label}
              count={labelCounts[label.id] || 0}
              isActive={activeLabels.has(label.id)}
              onToggle={onToggleLabel}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
