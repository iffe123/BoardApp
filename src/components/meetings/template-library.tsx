'use client';

/**
 * Template Library Component
 *
 * A sidebar/panel component that displays available agenda items and templates
 * that can be dragged and dropped into the agenda builder.
 */

import React, { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  closestCenter,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  FileText,
  CheckCircle,
  MessageSquare,
  Gavel,
  ChevronDown,
  ChevronRight,
  Clock,
  Search,
  Sparkles,
  LayoutTemplate,
  GripVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn, formatDuration } from '@/lib/utils';
import {
  STANDARD_AGENDA_ITEMS,
  DEFAULT_TEMPLATES,
  getGroupedStandardItems,
  type StandardAgendaItem,
  type TemplateDefinition,
} from '@/lib/meeting-templates';
import type { AgendaItem, AgendaItemType } from '@/types/schema';

// ============================================================================
// TYPES
// ============================================================================

interface TemplateLibraryProps {
  onItemDrop?: (item: StandardAgendaItem) => void;
  onTemplateSelect?: (templateId: string) => void;
  onAIAssist?: () => void;
  locale?: 'en' | 'sv';
  meetingType?: 'ordinary' | 'extraordinary' | 'annual_general' | 'statutory';
  className?: string;
}

interface DraggableItemProps {
  item: StandardAgendaItem;
  locale: 'en' | 'sv';
}

// ============================================================================
// ITEM TYPE CONFIG
// ============================================================================

const itemTypeIcons: Record<AgendaItemType, React.ReactNode> = {
  information: <FileText className="h-4 w-4" />,
  decision: <CheckCircle className="h-4 w-4" />,
  discussion: <MessageSquare className="h-4 w-4" />,
  formality: <Gavel className="h-4 w-4" />,
};

const itemTypeColors: Record<AgendaItemType, string> = {
  information: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  decision: 'bg-green-500/10 text-green-500 border-green-500/20',
  discussion: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  formality: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
};

// ============================================================================
// DRAGGABLE ITEM
// ============================================================================

function DraggableItem({ item, locale }: DraggableItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `library-${item.id}`,
    data: { item },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: isDragging ? 1000 : undefined,
      }
    : undefined;

  const title = locale === 'sv' ? item.titleSv : item.title;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'flex items-center gap-2 p-2 rounded-md border cursor-grab transition-all',
        'hover:bg-accent hover:border-accent-foreground/20',
        isDragging && 'opacity-50 shadow-lg',
        'bg-card'
      )}
    >
      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />

      <Badge
        variant="outline"
        className={cn('shrink-0 gap-1', itemTypeColors[item.type])}
      >
        {itemTypeIcons[item.type]}
      </Badge>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{title}</p>
      </div>

      <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
        <Clock className="h-3 w-3" />
        <span>{item.estimatedDuration}m</span>
      </div>

      {item.isRequired && (
        <Badge variant="secondary" className="shrink-0 text-xs">
          Required
        </Badge>
      )}
    </div>
  );
}

// ============================================================================
// TEMPLATE CARD
// ============================================================================

interface TemplateCardProps {
  template: TemplateDefinition;
  locale: 'en' | 'sv';
  onSelect: () => void;
}

function TemplateCard({ template, locale, onSelect }: TemplateCardProps) {
  const name = locale === 'sv' ? template.nameSv : template.name;
  const description = locale === 'sv' ? template.descriptionSv : template.description;

  return (
    <Card
      className="cursor-pointer transition-all hover:border-primary"
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium truncate">{name}</h4>
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {description}
            </p>
          </div>
          <LayoutTemplate className="h-5 w-5 text-muted-foreground shrink-0" />
        </div>

        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {template.itemIds.length} items
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDuration(template.defaultDuration)}
          </span>
        </div>

        <Badge variant="outline" className="mt-3">
          {template.meetingType.replace('_', ' ')}
        </Badge>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function TemplateLibrary({
  onItemDrop,
  onTemplateSelect,
  onAIAssist,
  locale = 'en',
  meetingType,
  className,
}: TemplateLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(['Opening & Closing'])
  );

  // Group items by category
  const groupedItems = useMemo(() => getGroupedStandardItems(), []);

  // Filter items based on search and meeting type
  const filteredItems = useMemo(() => {
    const filtered: Record<string, StandardAgendaItem[]> = {};

    for (const [group, items] of Object.entries(groupedItems)) {
      const matchingItems = items.filter(item => {
        // Search filter
        if (searchQuery) {
          const searchLower = searchQuery.toLowerCase();
          const title = locale === 'sv' ? item.titleSv : item.title;
          const desc = locale === 'sv' ? item.descriptionSv : item.description;

          if (
            !title.toLowerCase().includes(searchLower) &&
            !desc?.toLowerCase().includes(searchLower)
          ) {
            return false;
          }
        }

        return true;
      });

      if (matchingItems.length > 0) {
        filtered[group] = matchingItems;
      }
    }

    return filtered;
  }, [groupedItems, searchQuery, locale]);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return DEFAULT_TEMPLATES.filter(template => {
      if (meetingType && template.meetingType !== meetingType) {
        return false;
      }

      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const name = locale === 'sv' ? template.nameSv : template.name;
        const desc = locale === 'sv' ? template.descriptionSv : template.description;

        return (
          name.toLowerCase().includes(searchLower) ||
          desc.toLowerCase().includes(searchLower)
        );
      }

      return true;
    });
  }, [meetingType, searchQuery, locale]);

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <h3 className="font-semibold mb-3">
          {locale === 'sv' ? 'Mallbibliotek' : 'Template Library'}
        </h3>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={locale === 'sv' ? 'Sök...' : 'Search...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* AI Assist Button */}
        {onAIAssist && (
          <Button
            variant="outline"
            className="w-full mt-3 gap-2"
            onClick={onAIAssist}
          >
            <Sparkles className="h-4 w-4" />
            {locale === 'sv' ? 'AI-assistans' : 'AI Assistance'}
          </Button>
        )}
      </div>

      {/* Content */}
      <Tabs defaultValue="items" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-4 mt-4">
          <TabsTrigger value="items" className="flex-1">
            {locale === 'sv' ? 'Punkter' : 'Items'}
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex-1">
            {locale === 'sv' ? 'Mallar' : 'Templates'}
          </TabsTrigger>
        </TabsList>

        {/* Items Tab */}
        <TabsContent value="items" className="flex-1 overflow-auto p-4 space-y-2">
          <p className="text-xs text-muted-foreground mb-4">
            {locale === 'sv'
              ? 'Dra och släpp punkter till din dagordning'
              : 'Drag and drop items to your agenda'}
          </p>

          {Object.entries(filteredItems).map(([group, items]) => (
            <Collapsible
              key={group}
              open={expandedGroups.has(group)}
              onOpenChange={() => toggleGroup(group)}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between h-auto py-2"
                >
                  <span className="font-medium">{group}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {items.length}
                    </Badge>
                    {expandedGroups.has(group) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </div>
                </Button>
              </CollapsibleTrigger>

              <CollapsibleContent className="space-y-1 pl-2 mt-1">
                {items.map(item => (
                  <DraggableItem key={item.id} item={item} locale={locale} />
                ))}
              </CollapsibleContent>
            </Collapsible>
          ))}

          {Object.keys(filteredItems).length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              {locale === 'sv' ? 'Inga punkter hittades' : 'No items found'}
            </div>
          )}
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="flex-1 overflow-auto p-4 space-y-3">
          <p className="text-xs text-muted-foreground mb-4">
            {locale === 'sv'
              ? 'Välj en mall för att autofylla dagordningen'
              : 'Select a template to auto-fill the agenda'}
          </p>

          {filteredTemplates.map(template => (
            <TemplateCard
              key={template.id}
              template={template}
              locale={locale}
              onSelect={() => onTemplateSelect?.(template.id)}
            />
          ))}

          {filteredTemplates.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              {locale === 'sv' ? 'Inga mallar hittades' : 'No templates found'}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default TemplateLibrary;
