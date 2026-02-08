'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  FileText,
  Plus,
  Clock,
  Trash2,
  Copy,
  Check,
  Loader2,
  AlertTriangle,
  LayoutTemplate,
  Users,
  FileSignature,
  Briefcase,
  TrendingUp,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useAuth, usePermissions } from '@/contexts/auth-context';
import { collections, onSnapshot, query, orderBy, db, Timestamp } from '@/lib/firebase';
import { addDoc, deleteDoc, Timestamp as FirestoreTimestamp } from 'firebase/firestore';
import {
  STANDARD_AGENDA_ITEMS,
  DEFAULT_TEMPLATES,
  type StandardAgendaItem,
} from '@/lib/meeting-templates';
import type { MeetingTemplate, AgendaItemType } from '@/types/schema';

type MeetingType = 'ordinary' | 'extraordinary' | 'annual_general' | 'statutory';

const meetingTypeLabels: Record<MeetingType, string> = {
  ordinary: 'Ordinary Board Meeting',
  extraordinary: 'Extraordinary Board Meeting',
  annual_general: 'Annual General Meeting',
  statutory: 'Statutory Meeting',
};

const categoryIcons: Record<string, React.ReactNode> = {
  formality: <FileSignature className="h-4 w-4" />,
  governance: <Users className="h-4 w-4" />,
  financial: <TrendingUp className="h-4 w-4" />,
  strategic: <Briefcase className="h-4 w-4" />,
  operational: <Settings className="h-4 w-4" />,
  custom: <LayoutTemplate className="h-4 w-4" />,
};

const typeColors: Record<AgendaItemType, string> = {
  information: 'bg-blue-100 text-blue-800',
  decision: 'bg-green-100 text-green-800',
  discussion: 'bg-purple-100 text-purple-800',
  formality: 'bg-gray-100 text-gray-800',
};

interface CustomTemplate extends MeetingTemplate {
  id: string;
  tenantId: string;
  isCustom: true;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
  createdBy: string;
}

export default function MeetingTemplatesPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const { user } = useAuth();
  const { canManageMeetings } = usePermissions();

  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('builtin');

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  // New template form
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateMeetingType, setTemplateMeetingType] = useState<MeetingType>('ordinary');
  const [templateItems, setTemplateItems] = useState<StandardAgendaItem[]>([]);

  // Load custom templates
  useEffect(() => {
    if (!tenantId || !db) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const templatesRef = collections.templates(tenantId);
    const templatesQuery = query(templatesRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      templatesQuery,
      (snapshot) => {
        const templates: CustomTemplate[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as CustomTemplate[];
        setCustomTemplates(templates);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching templates:', err);
        setError('Failed to load templates');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [tenantId]);

  // Create new template
  const handleCreateTemplate = useCallback(async () => {
    if (!templateName.trim() || templateItems.length === 0) {
      setError('Please provide a name and add at least one agenda item');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const template = {
        name: templateName,
        nameSv: templateName,
        description: templateDescription,
        descriptionSv: templateDescription,
        meetingType: templateMeetingType,
        estimatedDuration: templateItems.reduce((sum, item) => sum + item.estimatedDuration, 0),
        items: templateItems.map((item, index) => ({
          standardItemId: item.id,
          order: index + 1,
          customTitle: item.title,
          customDuration: item.estimatedDuration,
        })),
        tenantId,
        isCustom: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: user?.uid || 'unknown',
      };

      await addDoc(collections.templates(tenantId), template);

      // Reset form
      setTemplateName('');
      setTemplateDescription('');
      setTemplateMeetingType('ordinary');
      setTemplateItems([]);
      setShowCreateDialog(false);
    } catch (err) {
      console.error('Error creating template:', err);
      setError('Failed to create template');
    } finally {
      setSaving(false);
    }
  }, [templateName, templateDescription, templateMeetingType, templateItems, tenantId, user]);

  // Delete template
  const handleDeleteTemplate = useCallback(async (templateId: string) => {
    try {
      await deleteDoc(collections.template(tenantId, templateId));
    } catch (err) {
      console.error('Error deleting template:', err);
      setError('Failed to delete template');
    }
  }, [tenantId]);

  // Duplicate built-in template as custom
  const handleDuplicateBuiltIn = useCallback((template: typeof DEFAULT_TEMPLATES[0]) => {
    setTemplateName(`${template.name} (Copy)`);
    setTemplateDescription(template.description || '');
    setTemplateMeetingType(template.meetingType as MeetingType);
    setTemplateItems(
      template.itemIds.map((itemId) => {
        const standardItem = STANDARD_AGENDA_ITEMS.find((si) => si.id === itemId);
        return standardItem || {
          id: itemId,
          title: 'Unknown Item',
          titleSv: 'Unknown Item',
          type: 'information' as AgendaItemType,
          estimatedDuration: 10,
          category: 'custom' as const,
          isRequired: false,
          requiredFor: [],
          sortOrder: 0,
        };
      })
    );
    setShowCreateDialog(true);
  }, []);

  // Add item to template
  const addItemToTemplate = useCallback((item: StandardAgendaItem) => {
    setTemplateItems((prev) => [...prev, item]);
  }, []);

  // Remove item from template
  const removeItemFromTemplate = useCallback((index: number) => {
    setTemplateItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Group standard items by category
  const itemsByCategory = STANDARD_AGENDA_ITEMS.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category]!.push(item);
    return acc;
  }, {} as Record<string, StandardAgendaItem[]>);

  if (loading) {
    return (
      <div className="p-8">
        <Card className="p-12 text-center">
          <Loader2 className="h-12 w-12 mx-auto text-muted-foreground mb-4 animate-spin" />
          <h3 className="text-lg font-semibold mb-2">Loading templates...</h3>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meeting Templates</h1>
          <p className="text-muted-foreground mt-1">
            Pre-configured agendas for different meeting types
          </p>
        </div>
        {canManageMeetings && (
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-4 w-4" />
              <span>{error}</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => setError(null)}>
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="builtin">
            <LayoutTemplate className="h-4 w-4 mr-2" />
            Built-in Templates ({DEFAULT_TEMPLATES.length})
          </TabsTrigger>
          <TabsTrigger value="custom">
            <FileText className="h-4 w-4 mr-2" />
            Custom Templates ({customTemplates.length})
          </TabsTrigger>
        </TabsList>

        {/* Built-in Templates */}
        <TabsContent value="builtin">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {DEFAULT_TEMPLATES.map((template) => (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {template.description}
                      </CardDescription>
                    </div>
                    <Badge variant="outline">
                      {meetingTypeLabels[template.meetingType as MeetingType] || template.meetingType}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      {template.itemIds.length} items
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {template.defaultDuration} min
                    </div>
                  </div>

                  {/* Preview items */}
                  <div className="space-y-1 mb-4">
                    {template.itemIds.slice(0, 4).map((itemId, index) => {
                      const standardItem = STANDARD_AGENDA_ITEMS.find(
                        (si) => si.id === itemId
                      );
                      return (
                        <div
                          key={itemId}
                          className="flex items-center gap-2 text-sm"
                        >
                          <span className="text-muted-foreground">{index + 1}.</span>
                          <span className="truncate">
                            {standardItem?.title || 'Unknown'}
                          </span>
                        </div>
                      );
                    })}
                    {template.itemIds.length > 4 && (
                      <p className="text-sm text-muted-foreground">
                        +{template.itemIds.length - 4} more items
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleDuplicateBuiltIn(template)}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Duplicate
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Custom Templates */}
        <TabsContent value="custom">
          {customTemplates.length === 0 ? (
            <Card className="p-12 text-center">
              <LayoutTemplate className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No custom templates</h3>
              <p className="text-muted-foreground mb-4">
                Create your own meeting templates or duplicate from built-in templates
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {customTemplates.map((template) => (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <CardDescription className="mt-1">
                          {template.description}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary">Custom</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        {template.agendaItems?.length || 0} items
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {template.defaultDuration} min
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleDeleteTemplate(template.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Create Meeting Template</DialogTitle>
            <DialogDescription>
              Build a custom agenda template for your meetings
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden grid grid-cols-2 gap-4">
            {/* Left: Template Details */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="E.g., Monthly Board Review"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder="Brief description of this template..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Meeting Type</Label>
                <Select
                  value={templateMeetingType}
                  onValueChange={(v: MeetingType) => setTemplateMeetingType(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(meetingTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Selected Items */}
              <div className="space-y-2">
                <Label>
                  Agenda Items ({templateItems.length}) -{' '}
                  {templateItems.reduce((sum, item) => sum + item.estimatedDuration, 0)} min total
                </Label>
                <ScrollArea className="h-[200px] border rounded-md p-2">
                  {templateItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Add items from the library on the right
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {templateItems.map((item, index) => (
                        <div
                          key={`${item.id}-${index}`}
                          className="flex items-center gap-2 p-2 bg-muted rounded-md"
                        >
                          <span className="text-sm text-muted-foreground w-6">
                            {index + 1}.
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.estimatedDuration} min
                            </p>
                          </div>
                          <Badge variant="outline" className={cn('text-xs', typeColors[item.type])}>
                            {item.type}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => removeItemFromTemplate(index)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>

            {/* Right: Item Library */}
            <div className="border-l pl-4">
              <Label className="mb-2 block">Standard Agenda Items</Label>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4 pr-4">
                  {Object.entries(itemsByCategory).map(([category, items]) => (
                    <div key={category}>
                      <div className="flex items-center gap-2 mb-2">
                        {categoryIcons[category]}
                        <span className="text-sm font-medium capitalize">{category}</span>
                      </div>
                      <div className="space-y-1">
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-2 p-2 hover:bg-muted rounded-md cursor-pointer"
                            onClick={() => addItemToTemplate(item)}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm truncate">{item.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.estimatedDuration} min
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className={cn('text-xs shrink-0', typeColors[item.type])}
                            >
                              {item.type}
                            </Badge>
                            <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                setTemplateName('');
                setTemplateDescription('');
                setTemplateItems([]);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateTemplate} disabled={saving || !templateName.trim()}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              {saving ? 'Creating...' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
