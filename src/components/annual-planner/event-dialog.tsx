'use client';

/**
 * Event Dialog - Create/Edit annual planner events
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import type {
  PlannerEvent,
  PlannerRing,
  PlannerActivityType,
  PlannerLabel,
} from '@/types/annual-planner';
import { generateId } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: PlannerEvent | null;
  rings: PlannerRing[];
  activityTypes: PlannerActivityType[];
  labels: PlannerLabel[];
  onSave: (event: PlannerEvent) => void;
  onDelete?: (eventId: string) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function EventDialog({
  open,
  onOpenChange,
  event,
  rings,
  activityTypes,
  labels,
  onSave,
  onDelete,
}: EventDialogProps) {
  const isEditing = !!event;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ringId, setRingId] = useState('');
  const [activityTypeId, setActivityTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedLabels, setSelectedLabels] = useState<Set<string>>(new Set());

  // Reset form when event changes
  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description || '');
      setRingId(event.ringId);
      setActivityTypeId(event.activityTypeId);
      setStartDate(formatDateInput(event.startDate));
      setEndDate(formatDateInput(event.endDate));
      setSelectedLabels(new Set(event.labelIds));
    } else {
      setTitle('');
      setDescription('');
      setRingId(rings[0]?.id || '');
      setActivityTypeId(activityTypes[0]?.id || '');
      setStartDate('');
      setEndDate('');
      setSelectedLabels(new Set());
    }
  }, [event, rings, activityTypes]);

  function formatDateInput(date: Date): string {
    const isoStr = date.toISOString();
    return isoStr.slice(0, 10);
  }

  function toggleLabel(labelId: string) {
    setSelectedLabels((prev) => {
      const next = new Set(prev);
      if (next.has(labelId)) {
        next.delete(labelId);
      } else {
        next.add(labelId);
      }
      return next;
    });
  }

  function handleSave() {
    if (!title.trim() || !startDate || !endDate || !ringId || !activityTypeId) return;

    const plannerEvent: PlannerEvent = {
      id: event?.id || generateId(),
      title: title.trim(),
      description: description.trim() || undefined,
      ringId,
      activityTypeId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      labelIds: Array.from(selectedLabels),
    };

    onSave(plannerEvent);
    onOpenChange(false);
  }

  function handleDelete() {
    if (event && onDelete) {
      onDelete(event.id);
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Redigera händelse' : 'Ny händelse'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Uppdatera information om denna händelse i årshjulet.'
              : 'Lägg till en ny händelse i årshjulet.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="event-title">Titel</Label>
            <Input
              id="event-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Händelsetitel"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="event-desc">Beskrivning</Label>
            <Textarea
              id="event-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Valfri beskrivning"
              rows={2}
            />
          </div>

          {/* Ring & Activity Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Ring</Label>
              <Select value={ringId} onValueChange={setRingId}>
                <SelectTrigger>
                  <SelectValue placeholder="Välj ring" />
                </SelectTrigger>
                <SelectContent>
                  {rings.map((ring) => (
                    <SelectItem key={ring.id} value={ring.id}>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: ring.color }}
                        />
                        {ring.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Aktivitetstyp</Label>
              <Select value={activityTypeId} onValueChange={setActivityTypeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Välj typ" />
                </SelectTrigger>
                <SelectContent>
                  {activityTypes.map((at) => (
                    <SelectItem key={at.id} value={at.id}>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded"
                          style={{ backgroundColor: at.color }}
                        />
                        {at.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="event-start">Startdatum</Label>
              <Input
                id="event-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-end">Slutdatum</Label>
              <Input
                id="event-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Labels */}
          {labels.length > 0 && (
            <div className="space-y-2">
              <Label>Etiketter</Label>
              <div className="flex flex-wrap gap-2">
                {labels.map((label) => (
                  <button
                    key={label.id}
                    type="button"
                    onClick={() => toggleLabel(label.id)}
                    className={`
                      inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium
                      border transition-colors
                      ${selectedLabels.has(label.id)
                        ? 'border-transparent text-white'
                        : 'border-border text-muted-foreground hover:bg-muted'
                      }
                    `}
                    style={
                      selectedLabels.has(label.id)
                        ? { backgroundColor: label.color }
                        : undefined
                    }
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: label.color }}
                    />
                    {label.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {isEditing && onDelete && (
            <Button variant="destructive" onClick={handleDelete} className="mr-auto">
              Ta bort
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Avbryt
          </Button>
          <Button onClick={handleSave} disabled={!title.trim() || !startDate || !endDate}>
            {isEditing ? 'Spara' : 'Lägg till'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
