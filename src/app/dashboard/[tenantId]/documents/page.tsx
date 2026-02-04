'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  Search,
  Filter,
  LayoutGrid,
  List,
  FileText,
  FolderOpen,
  Download,
  Trash2,
  MoreVertical,
  Upload,
  Eye,
  ChevronDown,
  File,
  FileSpreadsheet,
  FileImage,
  Calendar,
  Loader2,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn, formatFileSize, formatRelativeDate } from '@/lib/utils';
import type { Document, DocumentCategory } from '@/types/schema';
import { useAuth, usePermissions } from '@/contexts/auth-context';
import { collections, onSnapshot, query, orderBy, where, db } from '@/lib/firebase';

type ViewMode = 'grid' | 'list';

const categoryLabels: Record<DocumentCategory, string> = {
  board_pack: 'Board Pack',
  minutes: 'Minutes',
  financial: 'Financial',
  policy: 'Policy',
  contract: 'Contract',
  other: 'Other',
};

const categoryColors: Record<DocumentCategory, string> = {
  board_pack: 'bg-blue-100 text-blue-800',
  minutes: 'bg-green-100 text-green-800',
  financial: 'bg-purple-100 text-purple-800',
  policy: 'bg-amber-100 text-amber-800',
  contract: 'bg-red-100 text-red-800',
  other: 'bg-gray-100 text-gray-800',
};

function getFileIcon(mimeType: string) {
  if (mimeType.includes('pdf')) return <FileText className="h-8 w-8 text-red-500" />;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel'))
    return <FileSpreadsheet className="h-8 w-8 text-green-500" />;
  if (mimeType.includes('image')) return <FileImage className="h-8 w-8 text-blue-500" />;
  return <File className="h-8 w-8 text-gray-500" />;
}

export default function DocumentsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const { user, userProfile } = useAuth();
  const { canManageDocuments } = usePermissions();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filterCategory, setFilterCategory] = useState<DocumentCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);

  // Upload form state
  const [uploadFiles, setUploadFiles] = useState<FileList | null>(null);
  const [uploadCategory, setUploadCategory] = useState<DocumentCategory>('other');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadTags, setUploadTags] = useState('');
  const [uploadVisibility, setUploadVisibility] = useState<'internal' | 'shared' | 'confidential'>('internal');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch documents from Firestore
  useEffect(() => {
    if (!tenantId || !db) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const documentsRef = collections.documents(tenantId);
      const documentsQuery = query(
        documentsRef,
        where('isArchived', '==', false),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(
        documentsQuery,
        (snapshot) => {
          const fetchedDocs: Document[] = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Document[];
          setDocuments(fetchedDocs);
          setLoading(false);
        },
        (err) => {
          console.error('Error fetching documents:', err);
          setError('Failed to load documents');
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error('Error setting up listener:', err);
      setError('Failed to connect to database');
      setLoading(false);
    }
  }, [tenantId]);

  // Handle file upload
  const handleUpload = useCallback(async () => {
    if (!uploadFiles || uploadFiles.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      for (let i = 0; i < uploadFiles.length; i++) {
        const file = uploadFiles[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('tenantId', tenantId);
        formData.append('userId', user?.uid || '');
        formData.append('userName', userProfile?.displayName || user?.displayName || 'Unknown');
        formData.append('category', uploadCategory);
        formData.append('description', uploadDescription);
        formData.append('visibility', uploadVisibility);
        formData.append('tags', uploadTags);

        const response = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || `Failed to upload ${file.name}`);
        }
      }

      // Reset form and close dialog
      setUploadFiles(null);
      setUploadCategory('other');
      setUploadDescription('');
      setUploadTags('');
      setUploadVisibility('internal');
      setIsUploadOpen(false);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload documents');
    } finally {
      setUploading(false);
    }
  }, [uploadFiles, tenantId, user, userProfile, uploadCategory, uploadDescription, uploadVisibility, uploadTags]);

  // Handle document delete
  const handleDelete = useCallback(async (documentId: string) => {
    try {
      const response = await fetch(
        `/api/documents/${documentId}?tenantId=${tenantId}&userId=${user?.uid}&userName=${encodeURIComponent(userProfile?.displayName || 'Unknown')}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete document');
      }

      setDeleteDocId(null);
    } catch (err) {
      console.error('Delete error:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete document');
    }
  }, [tenantId, user, userProfile]);

  // Handle document download
  const handleDownload = useCallback((doc: Document) => {
    if (doc.downloadUrl) {
      window.open(doc.downloadUrl, '_blank');
    }
  }, []);

  // Filter documents
  const filteredDocuments = documents.filter((doc) => {
    const matchesCategory = filterCategory === 'all' || doc.category === filterCategory;
    const matchesSearch =
      searchQuery === '' ||
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Group by category for stats
  const documentsByCategory = documents.reduce(
    (acc, doc) => {
      acc[doc.category] = (acc[doc.category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Loading state
  if (loading) {
    return (
      <div className="p-8">
        <Card className="p-12 text-center">
          <Loader2 className="h-12 w-12 mx-auto text-muted-foreground mb-4 animate-spin" />
          <h3 className="text-lg font-semibold mb-2">Loading documents...</h3>
          <p className="text-muted-foreground">Fetching your documents</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Documents</h1>
          <p className="text-muted-foreground mt-1">
            Manage board packs, minutes, and company documents
          </p>
        </div>
        {canManageDocuments && (
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Document</DialogTitle>
                <DialogDescription>
                  Add a new document to your organization&apos;s repository
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div
                  className={cn(
                    'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors',
                    uploadFiles && 'border-primary bg-primary/5'
                  )}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => setUploadFiles(e.target.files)}
                  />
                  {uploadFiles ? (
                    <div className="space-y-2">
                      <Check className="h-8 w-8 mx-auto text-primary" />
                      <p className="font-medium">{uploadFiles.length} file(s) selected</p>
                      <p className="text-sm text-muted-foreground">
                        {Array.from(uploadFiles).map((f) => f.name).join(', ')}
                      </p>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                      <p className="text-sm text-muted-foreground mb-2">
                        Drag and drop your file here, or click to browse
                      </p>
                      <Button variant="outline" size="sm" type="button">
                        Browse Files
                      </Button>
                    </>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={uploadCategory} onValueChange={(v: DocumentCategory) => setUploadCategory(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(categoryLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Textarea
                    placeholder="Brief description of the document"
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tags (optional)</Label>
                  <Input
                    placeholder="Comma-separated tags (e.g., Q3, Budget, Draft)"
                    value={uploadTags}
                    onChange={(e) => setUploadTags(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Visibility</Label>
                  <Select value={uploadVisibility} onValueChange={(v: 'internal' | 'shared' | 'confidential') => setUploadVisibility(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="shared">Shared (visible to all members)</SelectItem>
                      <SelectItem value="internal">Internal (board members only)</SelectItem>
                      <SelectItem value="confidential">Confidential (restricted access)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setIsUploadOpen(false);
                  setUploadFiles(null);
                }}>
                  Cancel
                </Button>
                <Button onClick={handleUpload} disabled={!uploadFiles || uploading}>
                  {uploading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  {uploading ? 'Uploading...' : 'Upload'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-6 mb-8">
        {Object.entries(categoryLabels).map(([category, label]) => (
          <Card
            key={category}
            className={cn(
              'cursor-pointer transition-colors',
              filterCategory === category && 'border-primary'
            )}
            onClick={() =>
              setFilterCategory(filterCategory === category ? 'all' : (category as DocumentCategory))
            }
          >
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">{label}</div>
              <div className="text-2xl font-bold">{documentsByCategory[category] || 0}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                {filterCategory === 'all' ? 'All Categories' : categoryLabels[filterCategory]}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setFilterCategory('all')}>
                All Categories
              </DropdownMenuItem>
              {Object.entries(categoryLabels).map(([value, label]) => (
                <DropdownMenuItem
                  key={value}
                  onClick={() => setFilterCategory(value as DocumentCategory)}
                >
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredDocuments.length === 0 && (
        <Card className="p-12 text-center">
          <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No documents found</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery || filterCategory !== 'all'
              ? 'Try adjusting your filters or search query'
              : 'Upload your first document to get started'}
          </p>
          {!searchQuery && filterCategory === 'all' && (
            <Button onClick={() => setIsUploadOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          )}
        </Card>
      )}

      {/* Document List */}
      {filteredDocuments.length > 0 && viewMode === 'list' && (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 hover:bg-muted/50"
                >
                  <div className="flex items-center gap-4">
                    {getFileIcon(doc.mimeType)}
                    <div>
                      <p className="font-medium">{doc.name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline" className={categoryColors[doc.category]}>
                          {categoryLabels[doc.category]}
                        </Badge>
                        <span>{formatFileSize(doc.size)}</span>
                        <span>•</span>
                        <span>{formatRelativeDate(doc.updatedAt.toDate())}</span>
                        {doc.version > 1 && <span>• v{doc.version}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {doc.visibility === 'confidential' && (
                      <Badge variant="destructive">Confidential</Badge>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => handleDownload(doc)} title="View">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDownload(doc)} title="Download">
                      <Download className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleDownload(doc)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownload(doc)}>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Calendar className="h-4 w-4 mr-2" />
                          Attach to Meeting
                        </DropdownMenuItem>
                        {canManageDocuments && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteDocId(doc.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document Grid */}
      {filteredDocuments.length > 0 && viewMode === 'grid' && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredDocuments.map((doc) => (
            <Card key={doc.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  {getFileIcon(doc.mimeType)}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleDownload(doc)}>Preview</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownload(doc)}>Download</DropdownMenuItem>
                      <DropdownMenuItem>Attach to Meeting</DropdownMenuItem>
                      {canManageDocuments && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteDocId(doc.id)}
                          >
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <h3 className="font-medium text-sm truncate mb-1" title={doc.name}>
                  {doc.name}
                </h3>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className={cn('text-xs', categoryColors[doc.category])}>
                    {categoryLabels[doc.category]}
                  </Badge>
                  {doc.visibility === 'confidential' && (
                    <Badge variant="destructive" className="text-xs">
                      Confidential
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(doc.size)} • {formatRelativeDate(doc.updatedAt.toDate())}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteDocId} onOpenChange={(open) => !open && setDeleteDocId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDocId && handleDelete(deleteDocId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
