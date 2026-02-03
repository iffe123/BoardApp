'use client';

/**
 * Document Management Components
 *
 * Provides document listing, upload, and annotation capabilities.
 */

import React, { useState, useRef } from 'react';
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Eye,
  Lock,
  Unlock,
  User,
  Search,
  Filter,
  MoreVertical,
  FolderOpen,
  FileSpreadsheet,
  FileImage,
  File,
  Check,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn, formatFileSize, formatRelativeTime } from '@/lib/utils';
import type { Document, DocumentCategory } from '@/types/schema';

// ============================================================================
// TYPES
// ============================================================================

interface DocumentListProps {
  documents: Document[];
  onUpload: (files: FileList, metadata: Partial<Document>) => Promise<void>;
  onDownload: (document: Document) => Promise<void>;
  onDelete: (documentId: string) => Promise<void>;
  onView: (document: Document) => void;
  onUpdateMetadata: (documentId: string, updates: Partial<Document>) => Promise<void>;
  canManage: boolean;
  isLoading?: boolean;
}

// ============================================================================
// FILE TYPE HELPERS
// ============================================================================

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) {
    return <FileImage className="h-5 w-5 text-purple-600" />;
  }
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
    return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
  }
  if (mimeType.includes('pdf')) {
    return <FileText className="h-5 w-5 text-red-600" />;
  }
  return <File className="h-5 w-5 text-gray-600" />;
}

function getCategoryLabel(category: DocumentCategory): string {
  const labels: Record<DocumentCategory, string> = {
    board_pack: 'Board Pack',
    minutes: 'Minutes',
    financial: 'Financial',
    policy: 'Policy',
    contract: 'Contract',
    other: 'Other',
  };
  return labels[category] || category;
}

function getCategoryColor(category: DocumentCategory): string {
  const colors: Record<DocumentCategory, string> = {
    board_pack: 'bg-blue-100 text-blue-800',
    minutes: 'bg-purple-100 text-purple-800',
    financial: 'bg-green-100 text-green-800',
    policy: 'bg-amber-100 text-amber-800',
    contract: 'bg-red-100 text-red-800',
    other: 'bg-gray-100 text-gray-800',
  };
  return colors[category] || 'bg-gray-100 text-gray-800';
}

// ============================================================================
// DOCUMENT ROW COMPONENT
// ============================================================================

interface DocumentRowProps {
  document: Document;
  onDownload: () => void;
  onDelete: () => void;
  onView: () => void;
  canManage: boolean;
}

function DocumentRow({ document, onDownload, onDelete, onView, canManage }: DocumentRowProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <>
      <div className="flex items-center gap-4 p-4 hover:bg-muted/50 rounded-lg transition-colors">
        {/* Icon */}
        <div className="shrink-0">{getFileIcon(document.mimeType)}</div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <button
              onClick={onView}
              className="font-medium text-left hover:text-primary truncate"
            >
              {document.name}
            </button>
            {document.visibility === 'confidential' && (
              <Lock className="h-3 w-3 text-amber-600" />
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span>{formatFileSize(document.size)}</span>
            <span>&middot;</span>
            <span>{formatRelativeTime(document.createdAt.toDate())}</span>
            {document.description && (
              <>
                <span>&middot;</span>
                <span className="truncate max-w-[200px]">{document.description}</span>
              </>
            )}
          </div>
        </div>

        {/* Category & Tags */}
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className={getCategoryColor(document.category)}>
            {getCategoryLabel(document.category)}
          </Badge>
          {document.tags?.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          {document.tags && document.tags.length > 2 && (
            <Badge variant="secondary" className="text-xs">
              +{document.tags.length - 2}
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" onClick={onView} title="View">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDownload} title="Download">
            <Download className="h-4 w-4" />
          </Button>
          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onView}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{document.name}&quot;? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete();
                setShowDeleteConfirm(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ============================================================================
// UPLOAD DIALOG
// ============================================================================

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (files: FileList, metadata: Partial<Document>) => Promise<void>;
  isLoading?: boolean;
}

function UploadDialog({ open, onOpenChange, onUpload, isLoading }: UploadDialogProps) {
  const [files, setFiles] = useState<FileList | null>(null);
  const [category, setCategory] = useState<DocumentCategory>('other');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [visibility, setVisibility] = useState<'internal' | 'shared' | 'confidential'>('internal');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    if (!files) return;

    await onUpload(files, {
      category,
      description,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      visibility,
    });

    // Reset form
    setFiles(null);
    setCategory('other');
    setDescription('');
    setTags('');
    setVisibility('internal');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Documents</DialogTitle>
          <DialogDescription>
            Upload documents to share with board members. Maximum file size: 50MB.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File Input */}
          <div
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors',
              files && 'border-primary bg-primary/5'
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => setFiles(e.target.files)}
            />
            {files ? (
              <div className="space-y-2">
                <Check className="h-8 w-8 mx-auto text-primary" />
                <p className="font-medium">{files.length} file(s) selected</p>
                <p className="text-sm text-muted-foreground">
                  {Array.from(files)
                    .map((f) => f.name)
                    .join(', ')}
                </p>
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="font-medium">Click to select files</p>
                <p className="text-sm text-muted-foreground">or drag and drop</p>
              </>
            )}
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v: DocumentCategory) => setCategory(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="board_pack">Board Pack</SelectItem>
                <SelectItem value="minutes">Minutes</SelectItem>
                <SelectItem value="financial">Financial</SelectItem>
                <SelectItem value="policy">Policy</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the document..."
              rows={2}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags (optional)</Label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Comma-separated tags (e.g., Q3, Budget, Draft)"
            />
          </div>

          {/* Visibility */}
          <div className="space-y-2">
            <Label>Visibility</Label>
            <Select
              value={visibility}
              onValueChange={(v: 'internal' | 'shared' | 'confidential') => setVisibility(v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="shared">
                  <div className="flex items-center gap-2">
                    <Unlock className="h-4 w-4" />
                    Shared (visible to all members)
                  </div>
                </SelectItem>
                <SelectItem value="internal">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Internal (board members only)
                  </div>
                </SelectItem>
                <SelectItem value="confidential">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Confidential (restricted access)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!files || isLoading} isLoading={isLoading}>
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DocumentList({
  documents,
  onUpload,
  onDownload,
  onDelete,
  onView,
  canManage,
  isLoading,
}: DocumentListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  // Filter documents
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      !searchQuery ||
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  // Group by category (prepared for grouped view mode)
  const groupedDocuments = filteredDocuments.reduce(
    (acc, doc) => {
      const key = doc.category;
      if (!acc[key]) acc[key] = [];
      acc[key].push(doc);
      return acc;
    },
    {} as Record<string, Document[]>
  );
  void groupedDocuments; // Available for grouped view mode

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Documents</h2>
          <p className="text-sm text-muted-foreground">
            {documents.length} document{documents.length !== 1 ? 's' : ''}
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setShowUploadDialog(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents..."
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="board_pack">Board Pack</SelectItem>
            <SelectItem value="minutes">Minutes</SelectItem>
            <SelectItem value="financial">Financial</SelectItem>
            <SelectItem value="policy">Policy</SelectItem>
            <SelectItem value="contract">Contract</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Document List */}
      {filteredDocuments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No documents found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery || categoryFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Upload documents to share with board members'}
            </p>
            {canManage && !searchQuery && categoryFilter === 'all' && (
              <Button onClick={() => setShowUploadDialog(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Upload First Document
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 divide-y">
            {filteredDocuments.map((doc) => (
              <DocumentRow
                key={doc.id}
                document={doc}
                onDownload={() => onDownload(doc)}
                onDelete={() => onDelete(doc.id)}
                onView={() => onView(doc)}
                canManage={canManage}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Upload Dialog */}
      <UploadDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        onUpload={onUpload}
        isLoading={isLoading}
      />
    </div>
  );
}

export default DocumentList;
