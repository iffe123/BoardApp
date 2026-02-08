'use client';

/**
 * Annual Planner (Årshjul) Page
 *
 * Circular annual planning view inspired by Plandisc, for visualizing
 * board activities across the year. Supports disc view, list view,
 * and calendar view modes.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  List,
  Calendar,
  Download,
  Share2,
  MoreHorizontal,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { AnnualWheel } from '@/components/annual-planner/annual-wheel';
import { PlannerSidebar } from '@/components/annual-planner/planner-sidebar';
import { PlannerListView } from '@/components/annual-planner/planner-list-view';
import { EventDialog } from '@/components/annual-planner/event-dialog';
import type {
  PlannerRing,
  PlannerActivityType,
  PlannerLabel,
  PlannerEvent,
} from '@/types/annual-planner';

// ============================================================================
// MOCK DATA - Matches the Plandisc screenshot content
// ============================================================================

const DEFAULT_RINGS: PlannerRing[] = [
  { id: 'ring-1', name: 'Styrelsemöten', color: '#2dd4bf', visible: true, order: 0 },
  { id: 'ring-2', name: 'Generalförsamling och djupdykningar', color: '#f472b6', visible: true, order: 1 },
  { id: 'ring-3', name: 'Juridiska uppgifter', color: '#93c5fd', visible: true, order: 2 },
  { id: 'ring-4', name: 'Ekonomisk rapportering', color: '#c4b5fd', visible: true, order: 3 },
];

const DEFAULT_ACTIVITY_TYPES: PlannerActivityType[] = [
  { id: 'act-1', name: 'Sekundära styrelsemöten', color: '#5eead4', visible: true },
  { id: 'act-2', name: 'Rapportering', color: '#818cf8', visible: true },
  { id: 'act-3', name: 'Juridiskt', color: '#93c5fd', visible: true },
  { id: 'act-4', name: 'Primära styrelsemöten', color: '#0d9488', visible: true },
  { id: 'act-5', name: 'Strategimöten', color: '#f97316', visible: true },
  { id: 'act-6', name: 'Utvärderingar', color: '#6ee7b7', visible: true },
];

const DEFAULT_LABELS: PlannerLabel[] = [
  { id: 'lbl-1', name: 'Elisabeth', color: '#ef4444' },
  { id: 'lbl-2', name: 'Erik', color: '#8b5cf6' },
  { id: 'lbl-3', name: 'Ingen etikett', color: '#9ca3af' },
];

function generateMockEvents(year: number): PlannerEvent[] {
  return [
    // Styrelsemöten ring - Board meetings throughout the year
    {
      id: 'evt-1',
      title: 'Styrelsemöte Q1',
      ringId: 'ring-1',
      activityTypeId: 'act-4',
      startDate: new Date(year, 1, 15),
      endDate: new Date(year, 1, 28),
      labelIds: ['lbl-1'],
    },
    {
      id: 'evt-2',
      title: 'Strategimöte',
      ringId: 'ring-1',
      activityTypeId: 'act-5',
      startDate: new Date(year, 2, 10),
      endDate: new Date(year, 2, 25),
      labelIds: ['lbl-3'],
    },
    {
      id: 'evt-3',
      title: 'Styrelsemöte Q2',
      ringId: 'ring-1',
      activityTypeId: 'act-4',
      startDate: new Date(year, 4, 5),
      endDate: new Date(year, 4, 20),
      labelIds: ['lbl-1'],
    },
    {
      id: 'evt-4',
      title: 'Sekundärt styrelsemöte',
      ringId: 'ring-1',
      activityTypeId: 'act-1',
      startDate: new Date(year, 5, 1),
      endDate: new Date(year, 5, 15),
      labelIds: ['lbl-3'],
    },
    {
      id: 'evt-5',
      title: 'Styrelsemöte Q3',
      ringId: 'ring-1',
      activityTypeId: 'act-4',
      startDate: new Date(year, 7, 20),
      endDate: new Date(year, 8, 5),
      labelIds: ['lbl-3'],
    },
    {
      id: 'evt-6',
      title: 'Strategimöte höst',
      ringId: 'ring-1',
      activityTypeId: 'act-5',
      startDate: new Date(year, 9, 10),
      endDate: new Date(year, 9, 25),
      labelIds: ['lbl-2'],
    },
    {
      id: 'evt-7',
      title: 'Styrelsemöte Q4',
      ringId: 'ring-1',
      activityTypeId: 'act-4',
      startDate: new Date(year, 10, 15),
      endDate: new Date(year, 10, 30),
      labelIds: ['lbl-1'],
    },

    // Generalförsamling ring - AGM and deep dives
    {
      id: 'evt-8',
      title: 'Generalförsamling',
      ringId: 'ring-2',
      activityTypeId: 'act-1',
      startDate: new Date(year, 3, 15),
      endDate: new Date(year, 4, 5),
      labelIds: ['lbl-1'],
    },
    {
      id: 'evt-9',
      title: 'Resultatdjupdykning Q1',
      ringId: 'ring-2',
      activityTypeId: 'act-2',
      startDate: new Date(year, 1, 1),
      endDate: new Date(year, 1, 15),
      labelIds: ['lbl-3'],
    },
    {
      id: 'evt-10',
      title: 'Resultatdjupdykning Q2',
      ringId: 'ring-2',
      activityTypeId: 'act-2',
      startDate: new Date(year, 5, 15),
      endDate: new Date(year, 6, 1),
      labelIds: ['lbl-3'],
    },
    {
      id: 'evt-11',
      title: 'Planeringssession',
      ringId: 'ring-2',
      activityTypeId: 'act-1',
      startDate: new Date(year, 7, 1),
      endDate: new Date(year, 7, 15),
      labelIds: ['lbl-3'],
    },
    {
      id: 'evt-12',
      title: 'Utvärdering styrelsen',
      ringId: 'ring-2',
      activityTypeId: 'act-6',
      startDate: new Date(year, 10, 1),
      endDate: new Date(year, 10, 15),
      labelIds: ['lbl-1'],
    },
    {
      id: 'evt-13',
      title: 'Resultatdjupdykning Q3',
      ringId: 'ring-2',
      activityTypeId: 'act-2',
      startDate: new Date(year, 8, 15),
      endDate: new Date(year, 9, 1),
      labelIds: ['lbl-3'],
    },

    // Juridiska uppgifter ring - Legal tasks
    {
      id: 'evt-14',
      title: 'Årsredovisning',
      ringId: 'ring-3',
      activityTypeId: 'act-3',
      startDate: new Date(year, 2, 1),
      endDate: new Date(year, 3, 15),
      labelIds: ['lbl-3'],
    },
    {
      id: 'evt-15',
      title: 'Bolagsverket inlämning',
      ringId: 'ring-3',
      activityTypeId: 'act-3',
      startDate: new Date(year, 5, 15),
      endDate: new Date(year, 6, 30),
      labelIds: ['lbl-3'],
    },
    {
      id: 'evt-16',
      title: 'Revisionsrapport',
      ringId: 'ring-3',
      activityTypeId: 'act-3',
      startDate: new Date(year, 9, 1),
      endDate: new Date(year, 10, 1),
      labelIds: ['lbl-3'],
    },

    // Ekonomisk rapportering ring - Financial reporting
    {
      id: 'evt-17',
      title: 'Kvartalsrapport Q1',
      ringId: 'ring-4',
      activityTypeId: 'act-2',
      startDate: new Date(year, 0, 15),
      endDate: new Date(year, 1, 10),
      labelIds: ['lbl-3'],
    },
    {
      id: 'evt-18',
      title: 'Budgetuppföljning',
      ringId: 'ring-4',
      activityTypeId: 'act-2',
      startDate: new Date(year, 2, 15),
      endDate: new Date(year, 3, 5),
      labelIds: ['lbl-1'],
    },
    {
      id: 'evt-19',
      title: 'Kvartalsrapport Q2',
      ringId: 'ring-4',
      activityTypeId: 'act-2',
      startDate: new Date(year, 4, 15),
      endDate: new Date(year, 5, 10),
      labelIds: ['lbl-3'],
    },
    {
      id: 'evt-20',
      title: 'Kvartalsrapport Q3',
      ringId: 'ring-4',
      activityTypeId: 'act-2',
      startDate: new Date(year, 7, 15),
      endDate: new Date(year, 8, 10),
      labelIds: ['lbl-3'],
    },
  ];
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function AnnualPlannerPage() {
  // State
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [startMonth, setStartMonth] = useState(0); // January
  const [rings, setRings] = useState<PlannerRing[]>(DEFAULT_RINGS);
  const [activityTypes, setActivityTypes] = useState<PlannerActivityType[]>(DEFAULT_ACTIVITY_TYPES);
  const [labels] = useState<PlannerLabel[]>(DEFAULT_LABELS);
  const [events, setEvents] = useState<PlannerEvent[]>(() => generateMockEvents(currentYear));
  const [searchQuery, setSearchQuery] = useState('');
  const [activeLabels, setActiveLabels] = useState<Set<string>>(() => new Set(DEFAULT_LABELS.map((l) => l.id)));
  const [viewMode, setViewMode] = useState<'disc' | 'list' | 'calendar'>('disc');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<PlannerEvent | null>(null);

  // Filtered events
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      // Filter by search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!event.title.toLowerCase().includes(query)) return false;
      }

      // Filter by active labels
      if (activeLabels.size > 0 && event.labelIds.length > 0) {
        if (!event.labelIds.some((lid) => activeLabels.has(lid))) return false;
      }

      // Filter by visible activity types
      const activity = activityTypes.find((a) => a.id === event.activityTypeId);
      if (activity && !activity.visible) return false;

      return true;
    });
  }, [events, searchQuery, activeLabels, activityTypes]);

  // Ring toggles
  const handleToggleRing = useCallback((id: string) => {
    setRings((prev) =>
      prev.map((r) => (r.id === id ? { ...r, visible: !r.visible } : r))
    );
  }, []);

  const handleShowAllRings = useCallback(() => {
    setRings((prev) => prev.map((r) => ({ ...r, visible: true })));
  }, []);

  const handleHideAllRings = useCallback(() => {
    setRings((prev) => prev.map((r) => ({ ...r, visible: false })));
  }, []);

  // Activity toggles
  const handleToggleActivity = useCallback((id: string) => {
    setActivityTypes((prev) =>
      prev.map((a) => (a.id === id ? { ...a, visible: !a.visible } : a))
    );
  }, []);

  const handleShowAllActivities = useCallback(() => {
    setActivityTypes((prev) => prev.map((a) => ({ ...a, visible: true })));
  }, []);

  const handleHideAllActivities = useCallback(() => {
    setActivityTypes((prev) => prev.map((a) => ({ ...a, visible: false })));
  }, []);

  // Label toggles
  const handleToggleLabel = useCallback((id: string) => {
    setActiveLabels((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleShowAllLabels = useCallback(() => {
    setActiveLabels(new Set(labels.map((l) => l.id)));
  }, [labels]);

  const handleHideAllLabels = useCallback(() => {
    setActiveLabels(new Set());
  }, []);

  // Event actions
  const handleEventClick = useCallback((event: PlannerEvent) => {
    setEditingEvent(event);
    setDialogOpen(true);
  }, []);

  const handleNewEvent = useCallback(() => {
    setEditingEvent(null);
    setDialogOpen(true);
  }, []);

  const handleSaveEvent = useCallback((event: PlannerEvent) => {
    setEvents((prev) => {
      const existing = prev.findIndex((e) => e.id === event.id);
      if (existing >= 0) {
        const next = [...prev];
        next[existing] = event;
        return next;
      }
      return [...prev, event];
    });
  }, []);

  const handleDeleteEvent = useCallback((eventId: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
  }, []);

  // Year navigation
  const handlePrevYear = () => setYear((y) => y - 1);
  const handleNextYear = () => setYear((y) => y + 1);
  const handleResetYear = () => {
    setYear(currentYear);
    setStartMonth(0);
  };

  // Period display string
  const periodStart = MONTH_SHORT[startMonth];
  const periodEnd = MONTH_SHORT[(startMonth + 11) % 12];
  const periodLabel = `${periodStart} ${year} - ${periodEnd} ${startMonth === 0 ? year : year + 1}`;

  return (
    <div className="flex h-full">
      {/* Left Sidebar */}
      <div className="w-72 border-r bg-card flex-shrink-0 overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">Årshjul</h2>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Download className="h-4 w-4 mr-2" />
                Exportera
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Share2 className="h-4 w-4 mr-2" />
                Dela
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleResetYear}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Återställ vy
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <PlannerSidebar
          rings={rings}
          activityTypes={activityTypes}
          labels={labels}
          events={events}
          activeLabels={activeLabels}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onToggleRing={handleToggleRing}
          onShowAllRings={handleShowAllRings}
          onHideAllRings={handleHideAllRings}
          onToggleActivity={handleToggleActivity}
          onShowAllActivities={handleShowAllActivities}
          onHideAllActivities={handleHideAllActivities}
          onToggleLabel={handleToggleLabel}
          onShowAllLabels={handleShowAllLabels}
          onHideAllLabels={handleHideAllLabels}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="flex items-center justify-between border-b px-6 py-3 bg-card">
          {/* View Tabs */}
          <Tabs
            value={viewMode}
            onValueChange={(v) => setViewMode(v as 'disc' | 'list' | 'calendar')}
          >
            <TabsList>
              <TabsTrigger value="disc" className="gap-1.5">
                <CircleDot className="h-4 w-4" />
                Disk
              </TabsTrigger>
              <TabsTrigger value="list" className="gap-1.5">
                <List className="h-4 w-4" />
                Lista
              </TabsTrigger>
              <TabsTrigger value="calendar" className="gap-1.5">
                <Calendar className="h-4 w-4" />
                Kalender
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Period Navigation */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handlePrevYear} className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium text-foreground min-w-[160px] text-center">
              {periodLabel}
            </span>
            <Button variant="ghost" size="icon" onClick={handleNextYear} className="h-8 w-8">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Actions */}
          <Button onClick={handleNewEvent} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Ny händelse
          </Button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto bg-background p-4">
          {viewMode === 'disc' && (
            <AnnualWheel
              rings={rings}
              events={filteredEvents}
              activityTypes={activityTypes}
              startMonth={startMonth}
              year={year}
              onEventClick={handleEventClick}
              className="h-full"
            />
          )}

          {viewMode === 'list' && (
            <PlannerListView
              events={filteredEvents}
              rings={rings}
              activityTypes={activityTypes}
              labels={labels}
              onEventClick={handleEventClick}
              className="max-w-4xl mx-auto"
            />
          )}

          {viewMode === 'calendar' && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-1">
                Kalendervy
              </h3>
              <p className="text-sm text-muted-foreground">
                Kalendervy kommer snart. Använd diskvy eller listvy tills vidare.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Event Dialog */}
      <EventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        event={editingEvent}
        rings={rings}
        activityTypes={activityTypes}
        labels={labels}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
      />
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun',
  'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec',
];
