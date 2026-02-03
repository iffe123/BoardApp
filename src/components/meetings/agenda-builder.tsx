'use client';

/**
 * Smart Agenda Builder Component
 *
 * Drag-and-drop interface for creating and managing meeting agendas.
 * Implements polymorphic item types (Information, Decision, Discussion, Formality)
 * with automatic meeting end time calculation.
 */

import React, { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { v4 as uuidv4 } from 'uuid';
import {
  GripVertical,
  Plus,
  Trash2,
  Clock,
  FileText,
  CheckCircle,
  MessageSquare,
  Gavel,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Paperclip,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn, formatDuration, calculateAgendaDuration, getAgendaItemTypeColor } from '@/lib/utils';
import type { AgendaItem, AgendaItemType, Member } from '@/types/schema';

// ============================================================================
// TYPES
// ============================================================================

interface AgendaBuilderProps {
  items: AgendaItem[];
  onChange: (items: AgendaItem[]) => void;
  startTime: Date;
  members?: Member[];
  isLocked?: boolean;
  onItemClick?: (item: AgendaItem) => void;
}

interface SortableItemProps {
  item: AgendaItem;
  onUpdate: (item: AgendaItem) => void;
  onDelete: (id: string) => void;
  onExpand: (id: string) => void;
  isExpanded: boolean;
  isLocked: boolean;
  members?: Member[];
}

// ============================================================================
// ITEM TYPE CONFIG
// ============================================================================

const itemTypeConfig: Record<
  AgendaItemType,
  { label: string; icon: React.ReactNode; description: string }
> = {
  information: {
    label: 'Information',
    icon: <FileText className="h-4 w-4" />,
    description: 'Informational item - no decision required',
  },
  decision: {
    label: 'Decision',
    icon: <CheckCircle className="h-4 w-4" />,
    description: 'Requires formal vote and recording',
  },
  discussion: {
    label: 'Discussion',
    icon: <MessageSquare className="h-4 w-4" />,
    description: 'Open discussion item',
  },
  formality: {
    label: 'Formality',
    icon: <Gavel className="h-4 w-4" />,
    description: 'Procedural item (e.g., opening, adjournment)',
  },
};

// ============================================================================
// SORTABLE ITEM COMPONENT
// ============================================================================

function SortableItem({
  item,
  onUpdate,
  onDelete,
  onExpand,
  isExpanded,
  isLocked,
  members = [],
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: isLocked });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const typeConfig = itemTypeConfig[item.type];

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        'mb-2 transition-shadow',
        isDragging && 'shadow-lg opacity-90',
        isLocked && 'opacity-70'
      )}
    >
      <CardContent className="p-3">
        {/* Header Row */}
        <div className="flex items-center gap-2">
          {!isLocked && (
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
            >
              <GripVertical className="h-5 w-5" />
            </button>
          )}

          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
            {item.orderIndex + 1}
          </span>

          <Badge variant="outline" className={cn('gap-1', getAgendaItemTypeColor(item.type))}>
            {typeConfig.icon}
            {typeConfig.label}
          </Badge>

          {item.isConfidential && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              Confidential
            </Badge>
          )}

          <div className="flex-1">
            {isExpanded ? (
              <Input
                value={item.title}
                onChange={(e) => onUpdate({ ...item, title: e.target.value })}
                placeholder="Agenda item title"
                disabled={isLocked}
                className="h-8"
              />
            ) : (
              <span className="font-medium">{item.title || 'Untitled item'}</span>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{formatDuration(item.estimatedDuration)}</span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => onExpand(item.id)}
            className="h-8 w-8"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>

          {!isLocked && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(item.id)}
              className="h-8 w-8 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="mt-4 space-y-4 border-t pt-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Type Selection */}
              <div className="space-y-2">
                <Label>Item Type</Label>
                <Select
                  value={item.type}
                  onValueChange={(value: AgendaItemType) =>
                    onUpdate({ ...item, type: value })
                  }
                  disabled={isLocked}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(itemTypeConfig).map(([type, config]) => (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center gap-2">
                          {config.icon}
                          {config.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  min={1}
                  max={480}
                  value={item.estimatedDuration}
                  onChange={(e) =>
                    onUpdate({
                      ...item,
                      estimatedDuration: parseInt(e.target.value) || 5,
                    })
                  }
                  disabled={isLocked}
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description / Notes</Label>
              <Textarea
                value={item.description || ''}
                onChange={(e) => onUpdate({ ...item, description: e.target.value })}
                placeholder="Add details or notes for this agenda item..."
                rows={3}
                disabled={isLocked}
              />
            </div>

            {/* Presenter */}
            {members.length > 0 && (
              <div className="space-y-2">
                <Label>Presenter</Label>
                <Select
                  value={item.presenterId || ''}
                  onValueChange={(value) =>
                    onUpdate({
                      ...item,
                      presenterId: value || undefined,
                      presenterName: members.find((m) => m.id === value)?.title || undefined,
                    })
                  }
                  disabled={isLocked}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select presenter..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No presenter</SelectItem>
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {member.title || member.userId}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Conflict Keywords (for Jäv detection) */}
            <div className="space-y-2">
              <Label>Conflict Keywords (for conflict of interest detection)</Label>
              <Input
                value={item.conflictKeywords.join(', ')}
                onChange={(e) =>
                  onUpdate({
                    ...item,
                    conflictKeywords: e.target.value
                      .split(',')
                      .map((k) => k.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="Company names, persons (comma separated)"
                disabled={isLocked}
              />
              <p className="text-xs text-muted-foreground">
                Enter company or person names that may trigger conflict of interest warnings.
              </p>
            </div>

            {/* Attachments indicator */}
            {item.documentIds.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Paperclip className="h-4 w-4" />
                <span>{item.documentIds.length} attachment(s)</span>
              </div>
            )}

            {/* Confidential toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`confidential-${item.id}`}
                checked={item.isConfidential}
                onChange={(e) => onUpdate({ ...item, isConfidential: e.target.checked })}
                disabled={isLocked}
                className="rounded border-gray-300"
              />
              <Label htmlFor={`confidential-${item.id}`}>Mark as confidential</Label>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// DRAG OVERLAY ITEM
// ============================================================================

function DragOverlayItem({ item }: { item: AgendaItem }) {
  const typeConfig = itemTypeConfig[item.type];

  return (
    <Card className="shadow-xl">
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          <GripVertical className="h-5 w-5 text-muted-foreground" />
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
            {item.orderIndex + 1}
          </span>
          <Badge variant="outline" className={cn('gap-1', getAgendaItemTypeColor(item.type))}>
            {typeConfig.icon}
            {typeConfig.label}
          </Badge>
          <span className="flex-1 font-medium">{item.title || 'Untitled item'}</span>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{formatDuration(item.estimatedDuration)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// ADD ITEM DIALOG
// ============================================================================

interface AddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (item: Omit<AgendaItem, 'id' | 'orderIndex'>) => void;
}

function AddItemDialog({ open, onOpenChange, onAdd }: AddItemDialogProps) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<AgendaItemType>('information');
  const [duration, setDuration] = useState(15);
  const [description, setDescription] = useState('');

  const handleAdd = () => {
    onAdd({
      title,
      type,
      estimatedDuration: duration,
      description,
      documentIds: [],
      conflictKeywords: [],
      recusedMemberIds: [],
      actionItems: [],
      isConfidential: false,
      isCompleted: false,
    });
    // Reset form
    setTitle('');
    setType('information');
    setDuration(15);
    setDescription('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Agenda Item</DialogTitle>
          <DialogDescription>
            Create a new item for the meeting agenda.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label required>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter agenda item title"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Item Type</Label>
              <Select value={type} onValueChange={(v: AgendaItemType) => setType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(itemTypeConfig).map(([t, config]) => (
                    <SelectItem key={t} value={t}>
                      <div className="flex items-center gap-2">
                        {config.icon}
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                min={1}
                max={480}
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 15)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add additional details..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={!title.trim()}>
            Add Item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AgendaBuilder({
  items,
  onChange,
  startTime,
  members = [],
  isLocked = false,
}: AgendaBuilderProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showAddDialog, setShowAddDialog] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const activeItem = activeId ? items.find((item) => item.id === activeId) : null;

  // Calculate total duration and end time
  const totalDuration = calculateAgendaDuration(items);
  const endTime = new Date(startTime.getTime() + totalDuration * 60 * 1000);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (over && active.id !== over.id) {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const reorderedItems = arrayMove(items, oldIndex, newIndex).map((item, index) => ({
          ...item,
          orderIndex: index,
        }));

        onChange(reorderedItems);
      }
    },
    [items, onChange]
  );

  const handleUpdateItem = useCallback(
    (updatedItem: AgendaItem) => {
      const newItems = items.map((item) =>
        item.id === updatedItem.id ? updatedItem : item
      );
      onChange(newItems);
    },
    [items, onChange]
  );

  const handleDeleteItem = useCallback(
    (id: string) => {
      const newItems = items
        .filter((item) => item.id !== id)
        .map((item, index) => ({ ...item, orderIndex: index }));
      onChange(newItems);
    },
    [items, onChange]
  );

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleAddItem = useCallback(
    (itemData: Omit<AgendaItem, 'id' | 'orderIndex'>) => {
      const newItem: AgendaItem = {
        ...itemData,
        id: uuidv4(),
        orderIndex: items.length,
      };
      onChange([...items, newItem]);
    },
    [items, onChange]
  );

  return (
    <div className="space-y-4">
      {/* Header with summary */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Agenda</h3>
          <p className="text-sm text-muted-foreground">
            {items.length} item{items.length !== 1 ? 's' : ''} &middot;{' '}
            {formatDuration(totalDuration)} total &middot; Ends at{' '}
            {endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {!isLocked && (
          <Button onClick={() => setShowAddDialog(true)} leftIcon={<Plus className="h-4 w-4" />}>
            Add Item
          </Button>
        )}
      </div>

      {isLocked && (
        <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          The agenda is locked. No changes can be made.
        </div>
      )}

      {/* Agenda Items */}
      {items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
            <h4 className="mb-2 text-lg font-medium">No agenda items yet</h4>
            <p className="mb-4 text-sm text-muted-foreground">
              Start building your meeting agenda by adding items.
            </p>
            {!isLocked && (
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add First Item
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={items} strategy={verticalListSortingStrategy}>
            <div>
              {items.map((item) => (
                <SortableItem
                  key={item.id}
                  item={item}
                  onUpdate={handleUpdateItem}
                  onDelete={handleDeleteItem}
                  onExpand={handleToggleExpand}
                  isExpanded={expandedIds.has(item.id)}
                  isLocked={isLocked}
                  members={members}
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeItem && <DragOverlayItem item={activeItem} />}
          </DragOverlay>
        </DndContext>
      )}

      {/* Quick Add Templates */}
      {!isLocked && items.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground">Quick add:</span>
          {Object.entries(itemTypeConfig).map(([type, config]) => (
            <Button
              key={type}
              variant="outline"
              size="sm"
              onClick={() =>
                handleAddItem({
                  title: '',
                  type: type as AgendaItemType,
                  estimatedDuration: type === 'formality' ? 5 : 15,
                  documentIds: [],
                  conflictKeywords: [],
                  recusedMemberIds: [],
                  actionItems: [],
                  isConfidential: false,
                  isCompleted: false,
                })
              }
              className="h-7 gap-1"
            >
              {config.icon}
              {config.label}
            </Button>
          ))}
        </div>
      )}

      {/* Add Item Dialog */}
      <AddItemDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onAdd={handleAddItem}
      />
    </div>
  );
}

export default AgendaBuilder;
