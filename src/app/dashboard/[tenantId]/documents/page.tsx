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
  X,
} from 'lucide-react';
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
  board_pack: 'bg-blue-500/10 text-blue-400',
  minutes: 'bg-emerald-500/10 text-emerald-400',
  financial: 'bg-purple-500/10 text-purple-400',
  policy: 'bg-amber-500/10 text-amber-400',
  contract: 'bg-red-500/10 text-red-400',
  other: 'bg-white/10 text-white/50',
};

function getFileIcon(mimeType: string) {
  if (mimeType.includes('pdf')) return <FileText className="h-8 w-8 text-red-400" />;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel'))
    return <FileSpreadsheet className="h-8 w-8 text-emerald-400" />;
  if (mimeType.includes('image')) return <FileImage className="h-8 w-8 text-blue-400" />;
  return <File className="h-8 w-8 text-white/40" />;
}

export default function DocumentsPage() {
  const params = useParams();
  void params.tenantId;

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filterCategory, setFilterCategory] = useState<DocumentCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

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
    <div className="p-8 text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
          <p className="text-white/50 mt-1">
            Manage board packs, minutes, and company documents
          </p>
        </div>
        <button
          onClick={() => setIsUploadOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white text-black font-medium rounded-lg hover:bg-white/90 transition-colors"
        >
          <Upload className="h-4 w-4" />
          Upload Document
        </button>
      </div>

      {/* Upload Dialog */}
      {isUploadOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#141414] border border-white/10 rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-lg font-semibold">Upload Document</h2>
              <button onClick={() => setIsUploadOpen(false)} className="text-white/40 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="border-2 border-dashed border-white/10 rounded-lg p-8 text-center">
                <Upload className="h-10 w-10 mx-auto text-white/30 mb-4" />
                <p className="text-sm text-white/50 mb-2">
                  Drag and drop your file here, or click to browse
                </p>
                <button className="px-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white/70 hover:bg-white/10 transition-colors">
                  Browse Files
                </button>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white/70">Category</label>
                <select className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/20">
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white/70">Description (optional)</label>
                <input
                  type="text"
                  placeholder="Brief description of the document"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white/70">Visibility</label>
                <select className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/20">
                  <option value="internal">Internal</option>
                  <option value="confidential">Confidential</option>
                  <option value="shared">Shared</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 p-4 border-t border-white/10">
              <button
                onClick={() => setIsUploadOpen(false)}
                className="flex-1 px-4 py-2 bg-white/5 border border-white/10 text-white font-medium rounded-lg hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setIsUploadOpen(false)}
                className="flex-1 px-4 py-2 bg-white text-black font-medium rounded-lg hover:bg-white/90 transition-colors"
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-6 mb-10">
        {Object.entries(categoryLabels).map(([category, label]) => (
          <button
            key={category}
            onClick={() => setFilterCategory(filterCategory === category ? 'all' : (category as DocumentCategory))}
            className={cn(
              'p-4 rounded-xl transition-colors text-left',
              filterCategory === category
                ? 'bg-white/10 ring-1 ring-white/20'
                : 'bg-white/[0.02] hover:bg-white/[0.04]'
            )}
          >
            <p className="text-sm text-white/40">{label}</p>
            <p className="text-2xl font-bold mt-1">{documentsByCategory[category] || 0}</p>
          </button>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
          />
        </div>

        <div className="flex gap-2">
          <div className="relative">
            <button
              onClick={() => setFilterOpen(!filterOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/70 hover:bg-white/10 transition-colors"
            >
              <Filter className="h-4 w-4" />
              {filterCategory === 'all' ? 'All Categories' : categoryLabels[filterCategory]}
              <ChevronDown className="h-4 w-4" />
            </button>

            {filterOpen && (
              <div className="absolute top-full left-0 mt-1 py-1 bg-[#141414] border border-white/10 rounded-lg shadow-xl z-50 min-w-[160px]">
                <button
                  onClick={() => { setFilterCategory('all'); setFilterOpen(false); }}
                  className="w-full px-3 py-2 text-sm text-left text-white/70 hover:bg-white/5"
                >
                  All Categories
                </button>
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => { setFilterCategory(value as DocumentCategory); setFilterOpen(false); }}
                    className="w-full px-3 py-2 text-sm text-left text-white/70 hover:bg-white/5"
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex bg-white/5 border border-white/10 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2 transition-colors',
                viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-2 transition-colors',
                viewMode === 'list' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
              )}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredDocuments.length === 0 && (
        <div className="rounded-xl bg-white/[0.02] p-12 text-center">
          <FolderOpen className="h-12 w-12 mx-auto text-white/20 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No documents found</h3>
          <p className="text-white/50 mb-4">
            {searchQuery || filterCategory !== 'all'
              ? 'Try adjusting your filters or search query'
              : 'Upload your first document to get started'}
          </p>
          {!searchQuery && filterCategory === 'all' && (
            <button
              onClick={() => setIsUploadOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-black font-medium rounded-lg hover:bg-white/90 transition-colors mx-auto"
            >
              <Upload className="h-4 w-4" />
              Upload Document
            </button>
          )}
        </div>
      )}

      {/* Document List */}
      {filteredDocuments.length > 0 && viewMode === 'list' && (
        <div className="rounded-xl bg-white/[0.02] overflow-hidden">
          <div className="divide-y divide-white/5">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-4">
                  {getFileIcon(doc.mimeType)}
                  <div>
                    <p className="font-medium">{doc.name}</p>
                    <div className="flex items-center gap-2 text-sm text-white/40">
                      <span className={`px-2 py-0.5 text-xs rounded-md ${categoryColors[doc.category]}`}>
                        {categoryLabels[doc.category]}
                      </span>
                      <span>{formatFileSize(doc.size)}</span>
                      <span>•</span>
                      <span>{formatRelativeDate(doc.updatedAt.toDate())}</span>
                      {doc.version > 1 && <span>• v{doc.version}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {doc.visibility === 'confidential' && (
                    <span className="px-2 py-0.5 text-xs rounded-md bg-red-500/10 text-red-400">
                      Confidential
                    </span>
                  )}
                  <button className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                    <Eye className="h-4 w-4" />
                  </button>
                  <button className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                    <Download className="h-4 w-4" />
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setMenuOpen(menuOpen === doc.id ? null : doc.id)}
                      className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {menuOpen === doc.id && (
                      <div className="absolute top-full right-0 mt-1 py-1 bg-[#141414] border border-white/10 rounded-lg shadow-xl z-50 min-w-[140px]">
                        <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:bg-white/5">
                          <Eye className="h-4 w-4" />
                          Preview
                        </button>
                        <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:bg-white/5">
                          <Download className="h-4 w-4" />
                          Download
                        </button>
                        <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:bg-white/5">
                          <Calendar className="h-4 w-4" />
                          Attach to Meeting
                        </button>
                        <div className="border-t border-white/10 my-1" />
                        <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-white/5">
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Document Grid */}
      {filteredDocuments.length > 0 && viewMode === 'grid' && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredDocuments.map((doc) => (
            <div key={doc.id} className="rounded-xl bg-white/[0.02] p-4 hover:bg-white/[0.04] transition-colors">
              <div className="flex items-start justify-between mb-3">
                {getFileIcon(doc.mimeType)}
                <div className="relative">
                  <button
                    onClick={() => setMenuOpen(menuOpen === doc.id ? null : doc.id)}
                    className="p-1.5 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  {menuOpen === doc.id && (
                    <div className="absolute top-full right-0 mt-1 py-1 bg-[#141414] border border-white/10 rounded-lg shadow-xl z-50 min-w-[140px]">
                      <button className="w-full px-3 py-2 text-sm text-left text-white/70 hover:bg-white/5">Preview</button>
                      <button className="w-full px-3 py-2 text-sm text-left text-white/70 hover:bg-white/5">Download</button>
                      <button className="w-full px-3 py-2 text-sm text-left text-white/70 hover:bg-white/5">Attach to Meeting</button>
                      <div className="border-t border-white/10 my-1" />
                      <button className="w-full px-3 py-2 text-sm text-left text-red-400 hover:bg-white/5">Delete</button>
                    </div>
                  )}
                </div>
              </div>
              <h3 className="font-medium text-sm truncate mb-1" title={doc.name}>
                {doc.name}
              </h3>
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-0.5 text-xs rounded-md ${categoryColors[doc.category]}`}>
                  {categoryLabels[doc.category]}
                </span>
                {doc.visibility === 'confidential' && (
                  <span className="px-2 py-0.5 text-xs rounded-md bg-red-500/10 text-red-400">
                    Confidential
                  </span>
                )}
              </div>
              <p className="text-xs text-white/40">
                {formatFileSize(doc.size)} • {formatRelativeDate(doc.updatedAt.toDate())}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
