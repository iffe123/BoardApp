/**
 * GovernanceOS - Complete TypeScript Schema Definitions
 *
 * This file defines all Firestore data models for the multi-tenant
 * board governance platform, following the architectural blueprint.
 */

import { Timestamp } from 'firebase/firestore';

// ============================================================================
// CORE ENUMS AND TYPES
// ============================================================================

export type MemberRole = 'owner' | 'admin' | 'secretary' | 'chair' | 'director' | 'observer' | 'auditor';

export type MeetingStatus = 'draft' | 'scheduled' | 'active' | 'completed' | 'cancelled';

export type AgendaItemType = 'information' | 'decision' | 'discussion' | 'formality';

export type DecisionOutcome = 'approved' | 'rejected' | 'tabled' | 'withdrawn' | 'pending';

export type DocumentCategory = 'board_pack' | 'minutes' | 'financial' | 'policy' | 'contract' | 'other';

export type SignatureStatus = 'pending' | 'signed' | 'declined';

export type SubscriptionTier = 'free' | 'starter' | 'professional' | 'enterprise';

export type FinancialPeriodType = 'monthly' | 'quarterly' | 'annual';

// ============================================================================
// USER MODEL - Global collection (/users/{userId})
// ============================================================================

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  phoneNumber?: string;
  locale: string; // 'sv-SE', 'en-US', etc.
  timezone: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt?: Timestamp;

  // Notification preferences
  notifications: {
    email: boolean;
    push: boolean;
    meetingReminders: boolean;
    documentUpdates: boolean;
    taskAssignments: boolean;
  };

  // BankID verification status (Nordic compliance)
  bankIdVerified: boolean;
  bankIdSubject?: string; // Personal identification number hash
}

// Private notes sub-collection (/users/{userId}/private_notes/{noteId})
export interface PrivateNote {
  id: string;
  userId: string;
  documentId: string;
  tenantId: string;
  pageNumber?: number;
  position?: {
    x: number;
    y: number;
  };
  content: string;
  highlightedText?: string;
  color: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================================
// TENANT MODEL - Root collection (/tenants/{tenantId})
// ============================================================================

export interface Tenant {
  id: string;
  name: string;
  organizationNumber?: string; // Swedish org number (556xxx-xxxx)
  logoUrl?: string;
  industry?: string;
  website?: string;

  // Billing & Subscription
  subscription: {
    tier: SubscriptionTier;
    status: 'active' | 'past_due' | 'cancelled' | 'trialing';
    currentPeriodEnd: Timestamp;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
  };

  // Settings
  settings: {
    defaultLanguage: string;
    fiscalYearStart: number; // Month (1-12)
    requireBankIdSigning: boolean;
    allowGuestObservers: boolean;
    autoGenerateMinutes: boolean;
    meetingReminderDays: number;
  };

  // Address
  address?: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

// ============================================================================
// MEMBER MODEL - Sub-collection (/tenants/{tenantId}/members/{memberId})
// ============================================================================

export interface Member {
  id: string;
  tenantId: string;
  userId: string;
  role: MemberRole;

  // Profile within organization
  title?: string; // "CFO", "External Board Member", etc.
  department?: string;
  joinedAt: Timestamp;

  // Permissions
  permissions: {
    canCreateMeetings: boolean;
    canManageMembers: boolean;
    canAccessFinancials: boolean;
    canSignDocuments: boolean;
    canManageDocuments: boolean;
  };

  // Conflict of Interest (Jäv) tracking - Nordic compliance
  conflicts: ConflictOfInterest[];

  // Status
  isActive: boolean;
  invitedBy?: string;
  invitedAt?: Timestamp;
  acceptedAt?: Timestamp;
}

export interface ConflictOfInterest {
  id: string;
  entityName: string; // Company or person name
  entityType: 'company' | 'person' | 'organization';
  organizationNumber?: string;
  relationship: string; // "Board member", "Owner", "Spouse", etc.
  description?: string;
  declaredAt: Timestamp;
  validUntil?: Timestamp;
  isActive: boolean;
}

// ============================================================================
// MEETING MODEL - Sub-collection (/tenants/{tenantId}/meetings/{meetingId})
// ============================================================================

export interface Meeting {
  id: string;
  tenantId: string;

  // Basic info
  title: string;
  description?: string;
  meetingType: 'ordinary' | 'extraordinary' | 'annual_general' | 'statutory';
  status: MeetingStatus;

  // Scheduling
  scheduledStart: Timestamp;
  scheduledEnd: Timestamp;
  actualStart?: Timestamp;
  actualEnd?: Timestamp;
  timezone: string;

  // Location
  location: {
    type: 'physical' | 'virtual' | 'hybrid';
    address?: string;
    room?: string;
    videoConferenceUrl?: string;
    videoConferencePlatform?: 'teams' | 'zoom' | 'google_meet' | 'other';
    dialInNumber?: string;
    dialInPin?: string;
  };

  // Participants
  attendees: MeetingAttendee[];
  quorumRequired: number; // Minimum attendees for valid meeting

  // Agenda
  agendaItems: AgendaItem[];
  agendaLocked: boolean;
  agendaLockedAt?: Timestamp;
  agendaLockedBy?: string;

  // Minutes
  minutes?: MeetingMinutes;

  // Attachments
  documentIds: string[];

  // Template
  templateId?: string;
  templateName?: string;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  lastModifiedBy: string;
}

export interface MeetingAttendee {
  memberId: string;
  userId: string;
  displayName: string;
  role: 'chair' | 'secretary' | 'adjuster' | 'director' | 'observer' | 'guest';

  // Attendance tracking
  invitedAt: Timestamp;
  respondedAt?: Timestamp;
  response: 'pending' | 'accepted' | 'declined' | 'tentative';
  attendanceStatus?: 'present' | 'absent' | 'excused' | 'joined_late' | 'left_early';
  joinedAt?: Timestamp;
  leftAt?: Timestamp;

  // Voting rights
  hasVotingRights: boolean;

  // For guests
  guestEmail?: string;
  guestName?: string;
}

export interface AgendaItem {
  id: string;
  orderIndex: number;

  // Item details
  title: string;
  description?: string;
  type: AgendaItemType;

  // Time management
  estimatedDuration: number; // minutes
  actualDuration?: number;

  // Presenter
  presenterId?: string;
  presenterName?: string;

  // Decision items
  decision?: {
    motion?: string;
    outcome?: DecisionOutcome;
    votesFor?: number;
    votesAgainst?: number;
    abstentions?: number;
    votingMethod?: 'show_of_hands' | 'roll_call' | 'secret_ballot' | 'unanimous';
  };

  // Discussion notes (for minute generation)
  discussionNotes?: string;

  // Linked documents
  documentIds: string[];

  // Conflict of interest flags
  conflictKeywords: string[]; // Keywords to check against member conflicts
  recusedMemberIds: string[]; // Members who recused themselves

  // Action items generated from this agenda item
  actionItems: ActionItem[];

  // Status
  isConfidential: boolean;
  isCompleted: boolean;
}

export interface ActionItem {
  id: string;
  title: string;
  description?: string;
  assigneeId?: string;
  assigneeName?: string;
  dueDate?: Timestamp;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  completedAt?: Timestamp;
  createdAt: Timestamp;
}

// ============================================================================
// MEETING MINUTES MODEL
// ============================================================================

export interface MeetingMinutes {
  id: string;
  meetingId: string;
  tenantId: string;

  // Content
  version: number;
  status: 'draft' | 'review' | 'pending_signatures' | 'signed' | 'distributed';

  // Header information
  header: {
    meetingNumber?: string;
    meetingDate: Timestamp;
    location: string;
    callToOrder: Timestamp;
    adjournment?: Timestamp;
  };

  // Attendance record
  attendance: {
    present: string[];
    absent: string[];
    excused: string[];
    guests: string[];
  };

  // Minutes content per agenda item
  itemMinutes: MinuteItem[];

  // Signatures (Swedish: Chair + Adjuster)
  signatures: MinuteSignature[];

  // AI-generated summary
  aiSummary?: string;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  lastModifiedBy: string;

  // Document hash for integrity
  contentHash?: string;
}

export interface MinuteItem {
  agendaItemId: string;
  orderIndex: number;
  title: string;
  type: AgendaItemType;

  // Content
  discussion: string;
  decision?: {
    motion: string;
    outcome: DecisionOutcome;
    votesFor?: number;
    votesAgainst?: number;
    abstentions?: number;
  };

  // Action items
  actionItems: ActionItem[];

  // Recusals documented
  recusals?: {
    memberId: string;
    memberName: string;
    reason: string;
  }[];
}

export interface MinuteSignature {
  signerId: string;
  signerName: string;
  signerRole: 'chair' | 'adjuster' | 'secretary';

  status: SignatureStatus;
  signedAt?: Timestamp;

  // Digital signature details
  signatureMethod?: 'bankid' | 'bankid_mobile' | 'touch_signature' | 'sms_otp';
  signatureTransactionId?: string;
  signatureCertificate?: string;

  // For declined signatures
  declineReason?: string;
}

// ============================================================================
// DOCUMENT MODEL - Sub-collection (/tenants/{tenantId}/documents/{documentId})
// ============================================================================

export interface Document {
  id: string;
  tenantId: string;

  // File info
  name: string;
  description?: string;
  category: DocumentCategory;
  mimeType: string;
  size: number; // bytes

  // Storage
  storagePath: string;
  downloadUrl?: string;
  thumbnailUrl?: string;

  // Version control
  version: number;
  previousVersionId?: string;

  // Access control
  visibility: 'internal' | 'shared' | 'confidential';
  allowedMemberIds?: string[];
  allowedRoles?: MemberRole[];

  // Associations
  meetingIds: string[];
  agendaItemIds: string[];

  // Tags and search
  tags: string[];
  searchableText?: string; // Extracted text for full-text search

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  uploadedBy: string;
  lastAccessedAt?: Timestamp;

  // Document retention
  retentionPeriod?: number; // days
  expiresAt?: Timestamp;
  isArchived: boolean;
}

// ============================================================================
// FINANCIAL MODELS - Sub-collection (/tenants/{tenantId}/financials/{periodId})
// ============================================================================

export interface FinancialPeriod {
  id: string;
  tenantId: string;

  // Period identification
  period: string; // 'YYYY-MM' format
  periodType: FinancialPeriodType;
  fiscalYear: number;
  fiscalQuarter?: number;

  // Income Statement
  incomeStatement: {
    revenue: number;
    costOfGoodsSold: number;
    grossProfit: number;
    operatingExpenses: number;
    operatingIncome: number; // EBIT
    interestExpense: number;
    interestIncome: number;
    otherIncome: number;
    otherExpenses: number;
    taxExpense: number;
    netIncome: number;

    // Breakdown
    revenueByCategory?: Record<string, number>;
    expensesByCategory?: Record<string, number>;
  };

  // Balance Sheet
  balanceSheet: {
    // Assets
    cashAndEquivalents: number;
    accountsReceivable: number;
    inventory: number;
    prepaidExpenses: number;
    otherCurrentAssets: number;
    totalCurrentAssets: number;

    propertyPlantEquipment: number;
    intangibleAssets: number;
    longTermInvestments: number;
    otherNonCurrentAssets: number;
    totalNonCurrentAssets: number;
    totalAssets: number;

    // Liabilities
    accountsPayable: number;
    shortTermDebt: number;
    accruedLiabilities: number;
    otherCurrentLiabilities: number;
    totalCurrentLiabilities: number;

    longTermDebt: number;
    deferredTaxLiabilities: number;
    otherNonCurrentLiabilities: number;
    totalNonCurrentLiabilities: number;
    totalLiabilities: number;

    // Equity
    commonStock: number;
    retainedEarnings: number;
    otherEquity: number;
    totalEquity: number;
  };

  // Cash Flow Statement
  cashFlow: {
    operatingCashFlow: number;
    investingCashFlow: number;
    financingCashFlow: number;
    netCashFlow: number;
    beginningCash: number;
    endingCash: number;
  };

  // Key Performance Indicators
  kpis: {
    grossMargin: number;
    operatingMargin: number;
    netMargin: number;
    ebitda: number;
    ebitdaMargin: number;
    currentRatio: number;
    quickRatio: number;
    debtToEquity: number;
    returnOnEquity: number;
    returnOnAssets: number;
    workingCapital: number;
  };

  // Budget comparison
  budget?: {
    revenue: number;
    operatingExpenses: number;
    netIncome: number;
  };

  // Data source
  source: 'manual' | 'fortnox' | 'visma' | 'pe_accounting' | 'import';
  sourceMetadata?: {
    importedAt: Timestamp;
    importedBy: string;
    erpConnectionId?: string;
    lastSyncAt?: Timestamp;
  };

  // AI-generated insights
  aiAnalysis?: {
    summary: string;
    keyTrends: string[];
    concerns: string[];
    recommendations: string[];
    generatedAt: Timestamp;
  };

  // Status
  status: 'draft' | 'preliminary' | 'final' | 'audited';
  approvedBy?: string;
  approvedAt?: Timestamp;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

// ============================================================================
// ERP INTEGRATION MODEL
// ============================================================================

export interface ERPConnection {
  id: string;
  tenantId: string;

  provider: 'fortnox' | 'visma' | 'pe_accounting' | 'xero' | 'quickbooks';
  status: 'active' | 'disconnected' | 'error' | 'pending_auth';

  // OAuth tokens (encrypted in storage)
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Timestamp;

  // Sync settings
  syncEnabled: boolean;
  syncFrequency: 'daily' | 'weekly' | 'monthly' | 'manual';
  lastSyncAt?: Timestamp;
  lastSyncStatus?: 'success' | 'partial' | 'failed';
  lastSyncError?: string;

  // Account mapping
  accountMapping?: Record<string, string>;

  // Metadata
  connectedAt: Timestamp;
  connectedBy: string;
  updatedAt: Timestamp;
}

// ============================================================================
// DECISION REGISTER - Sub-collection (/tenants/{tenantId}/decisions/{decisionId})
// ============================================================================

export interface Decision {
  id: string;
  tenantId: string;
  meetingId: string;
  agendaItemId: string;

  // Decision details
  decisionNumber: string; // Sequential number within org
  title: string;
  description: string;
  motion: string;

  // Outcome
  outcome: DecisionOutcome;
  votingMethod: 'show_of_hands' | 'roll_call' | 'secret_ballot' | 'unanimous';
  votesFor: number;
  votesAgainst: number;
  abstentions: number;

  // Participants
  participantIds: string[];
  recusedMemberIds: string[];

  // Follow-up
  actionItems: ActionItem[];
  implementationDeadline?: Timestamp;
  implementationStatus: 'pending' | 'in_progress' | 'completed' | 'cancelled';

  // Links
  relatedDocumentIds: string[];
  relatedDecisionIds: string[];

  // Metadata
  decidedAt: Timestamp;
  recordedBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================================
// MEETING TEMPLATE MODEL
// ============================================================================

export interface MeetingTemplate {
  id: string;
  tenantId?: string; // null for system templates

  name: string;
  description?: string;
  meetingType: 'ordinary' | 'extraordinary' | 'annual_general' | 'statutory';

  // Template agenda
  agendaItems: Omit<AgendaItem, 'id' | 'decision' | 'actionItems' | 'isCompleted'>[];

  // Default settings
  defaultDuration: number; // minutes
  defaultQuorum: number;

  // Access
  visibility: 'public' | 'private' | 'hidden';
  accessCode?: string;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  usageCount: number;
}

// ============================================================================
// AUDIT LOG MODEL - Sub-collection (/tenants/{tenantId}/audit_logs/{logId})
// ============================================================================

export interface AuditLog {
  id: string;
  tenantId: string;

  // Action details
  action: string; // 'meeting.created', 'document.signed', etc.
  resourceType: 'meeting' | 'document' | 'member' | 'financial' | 'decision' | 'settings';
  resourceId: string;

  // Actor
  actorId: string;
  actorName: string;
  actorIp?: string;
  actorUserAgent?: string;

  // Change details
  changes?: {
    field: string;
    oldValue?: unknown;
    newValue?: unknown;
  }[];

  // Context
  metadata?: Record<string, unknown>;

  // Timestamp
  timestamp: Timestamp;
}

// ============================================================================
// SIGNATURE AUDIT - For digital signature compliance
// ============================================================================

export interface SignatureAudit {
  id: string;
  tenantId: string;
  documentId: string;
  documentType: 'minutes' | 'resolution' | 'contract' | 'policy';

  // Document integrity
  documentHash: string; // SHA-256 hash at time of signing
  documentVersion: number;

  // Signer info
  signerId: string;
  signerName: string;
  signerEmail: string;

  // Signature details
  signatureMethod: 'bankid' | 'bankid_mobile' | 'touch_signature' | 'sms_otp';
  signatureTransactionId: string;
  signatureCertificate?: string;

  // BankID specific (Nordic compliance)
  bankIdDetails?: {
    personalNumber?: string; // Hashed
    givenName: string;
    surname: string;
    notBefore: Timestamp;
    notAfter: Timestamp;
    ipAddress?: string;
  };

  // eIDAS compliance
  signatureLevel: 'simple' | 'advanced' | 'qualified';

  // Timestamp
  signedAt: Timestamp;

  // Verification
  verified: boolean;
  verifiedAt?: Timestamp;
  verificationError?: string;
}

// ============================================================================
// CLIENT MANAGER MODELS (for accounting firms managing multiple orgs)
// ============================================================================

export interface ClientManagerProfile {
  id: string;
  userId: string;
  firmName: string;
  firmOrganizationNumber?: string;

  // Managed tenants
  managedTenantIds: string[];

  // Settings
  settings: {
    defaultTemplateIds: string[];
    brandingEnabled: boolean;
    logoUrl?: string;
  };

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================================
// NOTIFICATION MODEL
// ============================================================================

export interface Notification {
  id: string;
  userId: string;
  tenantId: string;

  type: 'meeting_reminder' | 'document_shared' | 'signature_required' | 'task_assigned' | 'comment_added' | 'meeting_updated';
  title: string;
  body: string;

  // Link to resource
  resourceType: string;
  resourceId: string;
  resourceUrl: string;

  // Status
  read: boolean;
  readAt?: Timestamp;

  // Delivery
  deliveredVia: ('in_app' | 'email' | 'push')[];

  // Metadata
  createdAt: Timestamp;
}

// ============================================================================
// ZOD SCHEMAS FOR VALIDATION
// ============================================================================

import { z } from 'zod';

export const FinancialReportSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/),
  periodType: z.enum(['monthly', 'quarterly', 'annual']),

  revenue: z.number(),
  costOfGoodsSold: z.number(),
  grossProfit: z.number(),
  operatingExpenses: z.number(),
  operatingIncome: z.number(),
  netIncome: z.number(),
  ebitda: z.number(),

  cashBalance: z.number(),
  accountsReceivable: z.number(),
  accountsPayable: z.number(),
  totalAssets: z.number(),
  totalLiabilities: z.number(),
  totalEquity: z.number(),
});

export const AgendaItemSchema = z.object({
  id: z.string(),
  orderIndex: z.number().min(0),
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  type: z.enum(['information', 'decision', 'discussion', 'formality']),
  estimatedDuration: z.number().min(1).max(480),
  presenterId: z.string().optional(),
  documentIds: z.array(z.string()).default([]),
  conflictKeywords: z.array(z.string()).default([]),
  isConfidential: z.boolean().default(false),
});

export const MeetingCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  meetingType: z.enum(['ordinary', 'extraordinary', 'annual_general', 'statutory']),
  scheduledStart: z.date(),
  scheduledEnd: z.date(),
  timezone: z.string(),
  location: z.object({
    type: z.enum(['physical', 'virtual', 'hybrid']),
    address: z.string().optional(),
    room: z.string().optional(),
    videoConferenceUrl: z.string().url().optional(),
  }),
  quorumRequired: z.number().min(1),
  attendeeIds: z.array(z.string()),
  templateId: z.string().optional(),
});

export const ConflictOfInterestSchema = z.object({
  entityName: z.string().min(1).max(200),
  entityType: z.enum(['company', 'person', 'organization']),
  organizationNumber: z.string().optional(),
  relationship: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
});

export type FinancialReportInput = z.infer<typeof FinancialReportSchema>;
export type AgendaItemInput = z.infer<typeof AgendaItemSchema>;
export type MeetingCreateInput = z.infer<typeof MeetingCreateSchema>;
export type ConflictOfInterestInput = z.infer<typeof ConflictOfInterestSchema>;
