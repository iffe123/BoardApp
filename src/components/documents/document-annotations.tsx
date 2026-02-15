'use client';

/**
 * Document Annotations Component
 *
 * Provides in-document commenting, highlighting, and note functionality.
 * Supports both shared annotations (visible to all members) and
 * private notes (visible only to the author).
 */

import React, { useState, useCallback } from 'react';
import {
  MessageSquare,
  Plus,
  Trash2,
  Lock,
  Globe,
  Send,
  StickyNote,
  MoreVertical,
  Edit2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn, formatRelativeTime } from '@/lib/utils';
import { Timestamp } from 'firebase/firestore';

// ============================================================================
// TYPES
// ============================================================================

export interface Annotation {
  id: string;
  documentId: string;
  tenantId: string;
  authorId: string;
  authorName: string;
  content: string;
  highlightedText?: string;
  pageNumber?: number;
  position?: { x: number; y: number };
  color: string;
  visibility: 'private' | 'shared';
  replies: AnnotationReply[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AnnotationReply {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: Timestamp;
}

interface DocumentAnnotationsProps {
  documentId: string;
  tenantId: string;
  currentUserId: string;
  currentUserName: string;
  annotations: Annotation[];
  onAddAnnotation: (annotation: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt' | 'replies'>) => Promise<void>;
  onUpdateAnnotation: (id: string, content: string) => Promise<void>;
  onDeleteAnnotation: (id: string) => Promise<void>;
  onAddReply: (annotationId: string, reply: Omit<AnnotationReply, 'id' | 'createdAt'>) => Promise<void>;
  canManage?: boolean;
}

// ============================================================================
// ANNOTATION COLORS
// ============================================================================

const ANNOTATION_COLORS = [
  { label: 'Yellow', value: '#fef08a' },
  { label: 'Green', value: '#bbf7d0' },
  { label: 'Blue', value: '#bfdbfe' },
  { label: 'Pink', value: '#fbcfe8' },
  { label: 'Orange', value: '#fed7aa' },
];

// ============================================================================
// ANNOTATION CARD
// ============================================================================

interface AnnotationCardProps {
  annotation: Annotation;
  currentUserId: string;
  onEdit: () => void;
  onDelete: () => void;
  onReply: (content: string) => void;
  canManage: boolean;
}

function AnnotationCard({
  annotation,
  currentUserId,
  onEdit,
  onDelete,
  onReply,
  canManage,
}: AnnotationCardProps) {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const isAuthor = annotation.authorId === currentUserId;

  const handleSubmitReply = () => {
    if (replyContent.trim()) {
      onReply(replyContent.trim());
      setReplyContent('');
      setShowReplyInput(false);
    }
  };

  return (
    <div
      className="rounded-lg border p-3 space-y-2"
      style={{ borderLeftColor: annotation.color, borderLeftWidth: '3px' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{annotation.authorName}</span>
          <Badge variant="outline" className="text-[10px] h-4">
            {annotation.visibility === 'private' ? (
              <><Lock className="h-2.5 w-2.5 mr-0.5" /> Private</>
            ) : (
              <><Globe className="h-2.5 w-2.5 mr-0.5" /> Shared</>
            )}
          </Badge>
          {annotation.pageNumber && (
            <Badge variant="secondary" className="text-[10px] h-4">
              p.{annotation.pageNumber}
            </Badge>
          )}
        </div>
        {(isAuthor || canManage) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isAuthor && (
                <DropdownMenuItem onClick={onEdit}>
                  <Edit2 className="h-3 w-3 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="h-3 w-3 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Highlighted text */}
      {annotation.highlightedText && (
        <div
          className="text-xs px-2 py-1 rounded italic"
          style={{ backgroundColor: annotation.color + '40' }}
        >
          &quot;{annotation.highlightedText}&quot;
        </div>
      )}

      {/* Content */}
      <p className="text-sm">{annotation.content}</p>

      {/* Timestamp */}
      <p className="text-xs text-muted-foreground">
        {annotation.createdAt?.toDate
          ? formatRelativeTime(annotation.createdAt.toDate())
          : ''}
      </p>

      {/* Replies */}
      {annotation.replies.length > 0 && (
        <div className="ml-4 space-y-2 border-l-2 pl-3">
          {annotation.replies.map((reply) => (
            <div key={reply.id} className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">{reply.authorName}</span>
                <span className="text-xs text-muted-foreground">
                  {reply.createdAt?.toDate
                    ? formatRelativeTime(reply.createdAt.toDate())
                    : ''}
                </span>
              </div>
              <p className="text-xs">{reply.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* Reply button and input */}
      {annotation.visibility === 'shared' && (
        <>
          {!showReplyInput ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-6"
              onClick={() => setShowReplyInput(true)}
            >
              <MessageSquare className="h-3 w-3 mr-1" />
              Reply
            </Button>
          ) : (
            <div className="flex items-start gap-2">
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                className="text-xs min-h-[60px]"
                rows={2}
              />
              <div className="flex flex-col gap-1">
                <Button
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleSubmitReply}
                  disabled={!replyContent.trim()}
                >
                  <Send className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    setShowReplyInput(false);
                    setReplyContent('');
                  }}
                >
                  &times;
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DocumentAnnotations({
  documentId,
  tenantId,
  currentUserId,
  currentUserName,
  annotations,
  onAddAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
  onAddReply,
  canManage = false,
}: DocumentAnnotationsProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingAnnotation, setEditingAnnotation] = useState<Annotation | null>(null);
  const [newContent, setNewContent] = useState('');
  const [newHighlightedText, setNewHighlightedText] = useState('');
  const [newColor, setNewColor] = useState(ANNOTATION_COLORS[0]!.value);
  const [newVisibility, setNewVisibility] = useState<'private' | 'shared'>('private');
  const [newPageNumber, setNewPageNumber] = useState('');
  const [filter, setFilter] = useState<'all' | 'private' | 'shared'>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter annotations for current user (show shared + own private)
  const visibleAnnotations = annotations.filter((a) => {
    if (a.visibility === 'shared') return true;
    if (a.visibility === 'private' && a.authorId === currentUserId) return true;
    return false;
  });

  const filteredAnnotations = visibleAnnotations.filter((a) => {
    if (filter === 'all') return true;
    return a.visibility === filter;
  });

  const handleAdd = useCallback(async () => {
    if (!newContent.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddAnnotation({
        documentId,
        tenantId,
        authorId: currentUserId,
        authorName: currentUserName,
        content: newContent.trim(),
        highlightedText: newHighlightedText.trim() || undefined,
        pageNumber: newPageNumber ? parseInt(newPageNumber, 10) : undefined,
        color: newColor,
        visibility: newVisibility,
      });

      // Reset form
      setNewContent('');
      setNewHighlightedText('');
      setNewPageNumber('');
      setShowAddDialog(false);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    newContent,
    newHighlightedText,
    newPageNumber,
    newColor,
    newVisibility,
    documentId,
    tenantId,
    currentUserId,
    currentUserName,
    onAddAnnotation,
  ]);

  const handleEdit = useCallback(
    async (content: string) => {
      if (!editingAnnotation || !content.trim()) return;

      setIsSubmitting(true);
      try {
        await onUpdateAnnotation(editingAnnotation.id, content.trim());
        setEditingAnnotation(null);
      } finally {
        setIsSubmitting(false);
      }
    },
    [editingAnnotation, onUpdateAnnotation]
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <StickyNote className="h-4 w-4" />
            Annotations
            <Badge variant="secondary" className="text-xs">
              {filteredAnnotations.length}
            </Badge>
          </CardTitle>
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-3 w-3 mr-1" />
            Add Note
          </Button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 mt-2">
          {(['all', 'shared', 'private'] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'secondary' : 'ghost'}
              size="sm"
              className="text-xs h-7"
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f === 'shared' ? 'Shared' : 'My Notes'}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        {filteredAnnotations.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <StickyNote className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No annotations yet</p>
            <p className="text-xs mt-1">Add notes, highlights, and comments to this document</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[500px]">
            <div className="space-y-3">
              {filteredAnnotations.map((annotation) => (
                <AnnotationCard
                  key={annotation.id}
                  annotation={annotation}
                  currentUserId={currentUserId}
                  onEdit={() => setEditingAnnotation(annotation)}
                  onDelete={() => onDeleteAnnotation(annotation.id)}
                  onReply={(content) =>
                    onAddReply(annotation.id, {
                      authorId: currentUserId,
                      authorName: currentUserName,
                      content,
                    })
                  }
                  canManage={canManage}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>

      {/* Add Annotation Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Annotation</DialogTitle>
            <DialogDescription>
              Add a note or comment to this document. Private notes are only visible to you.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Highlighted Text (optional)</Label>
              <Textarea
                value={newHighlightedText}
                onChange={(e) => setNewHighlightedText(e.target.value)}
                placeholder="Paste text you want to highlight..."
                rows={2}
                className="text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label>Your Note</Label>
              <Textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Write your annotation..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Page</Label>
                <input
                  type="number"
                  value={newPageNumber}
                  onChange={(e) => setNewPageNumber(e.target.value)}
                  placeholder="#"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  min={1}
                />
              </div>

              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-1">
                  {ANNOTATION_COLORS.map((c) => (
                    <button
                      key={c.value}
                      className={cn(
                        'h-7 w-7 rounded-full border-2',
                        newColor === c.value
                          ? 'border-foreground'
                          : 'border-transparent'
                      )}
                      style={{ backgroundColor: c.value }}
                      onClick={() => setNewColor(c.value)}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Visibility</Label>
                <Select
                  value={newVisibility}
                  onValueChange={(v: 'private' | 'shared') => setNewVisibility(v)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">
                      <span className="flex items-center gap-1">
                        <Lock className="h-3 w-3" /> Private
                      </span>
                    </SelectItem>
                    <SelectItem value="shared">
                      <span className="flex items-center gap-1">
                        <Globe className="h-3 w-3" /> Shared
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={!newContent.trim() || isSubmitting}>
              Add Annotation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Annotation Dialog */}
      <Dialog
        open={!!editingAnnotation}
        onOpenChange={(open) => !open && setEditingAnnotation(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Annotation</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              defaultValue={editingAnnotation?.content}
              onChange={(e) => {
                if (editingAnnotation) {
                  editingAnnotation.content = e.target.value;
                }
              }}
              rows={4}
              id="edit-annotation-content"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAnnotation(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const textarea = document.getElementById(
                  'edit-annotation-content'
                ) as HTMLTextAreaElement;
                if (textarea) handleEdit(textarea.value);
              }}
              disabled={isSubmitting}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default DocumentAnnotations;
