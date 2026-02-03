'use client';

import React, { useState } from 'react';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn, formatFileSize, formatRelativeDate } from '@/lib/utils';
import type { Document, DocumentCategory } from '@/types/schema';
import { Timestamp } from 'firebase/firestore';

// Mock documents
const mockDocuments: Document[] = [
  {
    id: '1',
    tenantId: 'tenant1',
    name: 'Q4 2024 Board Pack.pdf',
    description: 'Complete board pack for Q4 2024 meeting',
    category: 'board_pack',
    mimeType: 'application/pdf',
    size: 2456000,
    storagePath: '/documents/q4-board-pack.pdf',
    version: 1,
    visibility: 'internal',
    meetingIds: ['1'],
    agendaItemIds: [],
    tags: ['Q4', '2024', 'board pack'],
    createdAt: Timestamp.fromDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)),
    updatedAt: Timestamp.fromDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)),
    uploadedBy: 'user1',
    isArchived: false,
  },
  {
    id: '2',
    tenantId: 'tenant1',
    name: 'November Board Minutes.pdf',
    description: 'Signed minutes from November board meeting',
    category: 'minutes',
    mimeType: 'application/pdf',
    size: 845000,
    storagePath: '/documents/nov-minutes.pdf',
    version: 2,
    visibility: 'internal',
    meetingIds: ['3'],
    agendaItemIds: [],
    tags: ['minutes', 'November', '2024'],
    createdAt: Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
    updatedAt: Timestamp.fromDate(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)),
    uploadedBy: 'user2',
    isArchived: false,
  },
  {
    id: '3',
    tenantId: 'tenant1',
    name: 'Financial Report Q3 2024.xlsx',
    description: 'Quarterly financial report with detailed analysis',
    category: 'financial',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    size: 1250000,
    storagePath: '/documents/q3-financials.xlsx',
    version: 1,
    visibility: 'confidential',
    meetingIds: [],
    agendaItemIds: [],
    tags: ['financial', 'Q3', '2024'],
    createdAt: Timestamp.fromDate(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)),
    updatedAt: Timestamp.fromDate(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)),
    uploadedBy: 'user2',
    isArchived: false,
  },
  {
    id: '4',
    tenantId: 'tenant1',
    name: 'Corporate Governance Policy.pdf',
    description: 'Updated corporate governance guidelines',
    category: 'policy',
    mimeType: 'application/pdf',
    size: 567000,
    storagePath: '/documents/governance-policy.pdf',
    version: 3,
    visibility: 'internal',
    meetingIds: [],
    agendaItemIds: [],
    tags: ['policy', 'governance'],
    createdAt: Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
    updatedAt: Timestamp.fromDate(new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)),
    uploadedBy: 'user1',
    isArchived: false,
  },
  {
    id: '5',
    tenantId: 'tenant1',
    name: 'Supplier Agreement - TechCorp.pdf',
    description: 'Service agreement with TechCorp AB',
    category: 'contract',
    mimeType: 'application/pdf',
    size: 1890000,
    storagePath: '/documents/techcorp-agreement.pdf',
    version: 1,
    visibility: 'confidential',
    meetingIds: [],
    agendaItemIds: [],
    tags: ['contract', 'TechCorp', 'supplier'],
    createdAt: Timestamp.fromDate(new Date(Date.now() - 45 * 24 * 60 * 60 * 1000)),
    updatedAt: Timestamp.fromDate(new Date(Date.now() - 45 * 24 * 60 * 60 * 1000)),
    uploadedBy: 'user1',
    isArchived: false,
  },
];

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
  void params.tenantId; // Will be used for API calls

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filterCategory, setFilterCategory] = useState<DocumentCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Filter documents
  const filteredDocuments = mockDocuments.filter((doc) => {
    const matchesCategory = filterCategory === 'all' || doc.category === filterCategory;
    const matchesSearch =
      searchQuery === '' ||
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch && !doc.isArchived;
  });

  // Group by category for stats
  const documentsByCategory = mockDocuments.reduce(
    (acc, doc) => {
      if (!doc.isArchived) {
        acc[doc.category] = (acc[doc.category] || 0) + 1;
      }
      return acc;
    },
    {} as Record<string, number>
  );

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
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-2">
                  Drag and drop your file here, or click to browse
                </p>
                <Button variant="outline" size="sm">
                  Browse Files
                </Button>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select defaultValue="board_pack">
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
                <Input placeholder="Brief description of the document" />
              </div>
              <div className="space-y-2">
                <Label>Visibility</Label>
                <Select defaultValue="internal">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Internal</SelectItem>
                    <SelectItem value="confidential">Confidential</SelectItem>
                    <SelectItem value="shared">Shared</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUploadOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsUploadOpen(false)}>Upload</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

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
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Download className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Calendar className="h-4 w-4 mr-2" />
                          Attach to Meeting
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
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
                      <DropdownMenuItem>Preview</DropdownMenuItem>
                      <DropdownMenuItem>Download</DropdownMenuItem>
                      <DropdownMenuItem>Attach to Meeting</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
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
    </div>
  );
}
