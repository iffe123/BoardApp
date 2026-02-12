/**
 * Demo Organization Data
 *
 * Provides comprehensive test data for the demo organization.
 * This data is client-side only and never written to Firestore.
 */

import { Timestamp } from 'firebase/firestore';
import type {
  Tenant,
  Member,
  Meeting,
  Document,
  FinancialPeriod,
  Decision,
  MemberRole,
} from '@/types/schema';

// ============================================================================
// CONSTANTS
// ============================================================================

export const DEMO_TENANT_ID = '__demo__';

// ============================================================================
// HELPER - Create Timestamp from relative days offset
// ============================================================================

function daysFromNow(days: number): Timestamp {
  return Timestamp.fromDate(new Date(Date.now() + days * 24 * 60 * 60 * 1000));
}

function daysAgo(days: number): Timestamp {
  return Timestamp.fromDate(new Date(Date.now() - days * 24 * 60 * 60 * 1000));
}

function hoursFromNow(hours: number): Timestamp {
  return Timestamp.fromDate(new Date(Date.now() + hours * 60 * 60 * 1000));
}

// ============================================================================
// DEMO TENANT
// ============================================================================

export const demoTenant: Tenant = {
  id: DEMO_TENANT_ID,
  name: 'Nordström & Partners AB',
  organizationNumber: '556123-4567',
  industry: 'Technology & Consulting',
  website: 'https://nordstrom-partners.se',
  subscription: {
    tier: 'professional',
    status: 'active',
    currentPeriodEnd: daysFromNow(90),
  },
  settings: {
    defaultLanguage: 'sv',
    fiscalYearStart: 1,
    requireBankIdSigning: true,
    allowGuestObservers: false,
    autoGenerateMinutes: true,
    meetingReminderDays: 7,
  },
  address: {
    street: 'Kungsgatan 42',
    city: 'Stockholm',
    postalCode: '111 35',
    country: 'Sweden',
  },
  createdAt: daysAgo(365),
  updatedAt: daysAgo(1),
  createdBy: 'demo-user-1',
};

// ============================================================================
// DEMO MEMBERS
// ============================================================================

export const demoMembers: Member[] = [
  {
    id: 'demo-member-1',
    tenantId: DEMO_TENANT_ID,
    userId: 'demo-user-1',
    role: 'owner',
    title: 'VD / CEO',
    department: 'Executive',
    joinedAt: daysAgo(365),
    permissions: {
      canCreateMeetings: true,
      canManageMembers: true,
      canAccessFinancials: true,
      canSignDocuments: true,
      canManageDocuments: true,
    },
    conflicts: [],
    isActive: true,
    acceptedAt: daysAgo(365),
  },
  {
    id: 'demo-member-2',
    tenantId: DEMO_TENANT_ID,
    userId: 'demo-user-2',
    role: 'chair',
    title: 'Styrelseordförande',
    department: 'Board',
    joinedAt: daysAgo(350),
    permissions: {
      canCreateMeetings: true,
      canManageMembers: false,
      canAccessFinancials: true,
      canSignDocuments: true,
      canManageDocuments: true,
    },
    conflicts: [
      {
        id: 'conflict-1',
        entityName: 'TechVenture Nordic AB',
        entityType: 'company',
        organizationNumber: '556789-0123',
        relationship: 'Board member',
        description: 'Serves on the board of TechVenture Nordic AB',
        declaredAt: daysAgo(300),
        isActive: true,
      },
    ],
    isActive: true,
    acceptedAt: daysAgo(350),
  },
  {
    id: 'demo-member-3',
    tenantId: DEMO_TENANT_ID,
    userId: 'demo-user-3',
    role: 'secretary',
    title: 'Sekreterare',
    department: 'Administration',
    joinedAt: daysAgo(340),
    permissions: {
      canCreateMeetings: true,
      canManageMembers: false,
      canAccessFinancials: false,
      canSignDocuments: true,
      canManageDocuments: true,
    },
    conflicts: [],
    isActive: true,
    acceptedAt: daysAgo(340),
  },
  {
    id: 'demo-member-4',
    tenantId: DEMO_TENANT_ID,
    userId: 'demo-user-4',
    role: 'director',
    title: 'Styrelseledamot',
    department: 'Board',
    joinedAt: daysAgo(300),
    permissions: {
      canCreateMeetings: false,
      canManageMembers: false,
      canAccessFinancials: true,
      canSignDocuments: true,
      canManageDocuments: false,
    },
    conflicts: [],
    isActive: true,
    acceptedAt: daysAgo(300),
  },
  {
    id: 'demo-member-5',
    tenantId: DEMO_TENANT_ID,
    userId: 'demo-user-5',
    role: 'director',
    title: 'Styrelseledamot',
    department: 'Board',
    joinedAt: daysAgo(280),
    permissions: {
      canCreateMeetings: false,
      canManageMembers: false,
      canAccessFinancials: true,
      canSignDocuments: true,
      canManageDocuments: false,
    },
    conflicts: [
      {
        id: 'conflict-2',
        entityName: 'Green Energy Solutions',
        entityType: 'company',
        relationship: 'Majority shareholder',
        declaredAt: daysAgo(280),
        isActive: true,
      },
    ],
    isActive: true,
    acceptedAt: daysAgo(280),
  },
  {
    id: 'demo-member-6',
    tenantId: DEMO_TENANT_ID,
    userId: 'demo-user-6',
    role: 'auditor',
    title: 'Revisor',
    department: 'External',
    joinedAt: daysAgo(200),
    permissions: {
      canCreateMeetings: false,
      canManageMembers: false,
      canAccessFinancials: true,
      canSignDocuments: false,
      canManageDocuments: false,
    },
    conflicts: [],
    isActive: true,
    acceptedAt: daysAgo(200),
  },
  {
    id: 'demo-member-7',
    tenantId: DEMO_TENANT_ID,
    userId: 'demo-user-7',
    role: 'observer',
    title: 'Adjungerad',
    department: 'External',
    joinedAt: daysAgo(60),
    permissions: {
      canCreateMeetings: false,
      canManageMembers: false,
      canAccessFinancials: false,
      canSignDocuments: false,
      canManageDocuments: false,
    },
    conflicts: [],
    isActive: true,
    acceptedAt: daysAgo(60),
  },
];

// ============================================================================
// DEMO MEETINGS
// ============================================================================

export const demoMeetings: Meeting[] = [
  // Upcoming meeting
  {
    id: 'demo-meeting-1',
    tenantId: DEMO_TENANT_ID,
    title: 'Styrelsemöte Q1 2026',
    description: 'Ordinarie styrelsemöte med fokus på Q1-resultat och strategisk plan för H2.',
    meetingType: 'ordinary',
    status: 'scheduled',
    scheduledStart: daysFromNow(5),
    scheduledEnd: hoursFromNow(5 * 24 + 3),
    timezone: 'Europe/Stockholm',
    location: {
      type: 'hybrid',
      address: 'Kungsgatan 42, Stockholm',
      room: 'Boardroom A',
      videoConferenceUrl: 'https://teams.microsoft.com/demo',
      videoConferencePlatform: 'teams',
    },
    attendees: [
      {
        memberId: 'demo-member-1', userId: 'demo-user-1', displayName: 'Erik Nordström',
        role: 'director', invitedAt: daysAgo(10), response: 'accepted', hasVotingRights: true,
      },
      {
        memberId: 'demo-member-2', userId: 'demo-user-2', displayName: 'Anna Bergqvist',
        role: 'chair', invitedAt: daysAgo(10), response: 'accepted', hasVotingRights: true,
      },
      {
        memberId: 'demo-member-3', userId: 'demo-user-3', displayName: 'Lars Johansson',
        role: 'secretary', invitedAt: daysAgo(10), response: 'accepted', hasVotingRights: false,
      },
      {
        memberId: 'demo-member-4', userId: 'demo-user-4', displayName: 'Karin Lindgren',
        role: 'director', invitedAt: daysAgo(10), response: 'accepted', hasVotingRights: true,
      },
      {
        memberId: 'demo-member-5', userId: 'demo-user-5', displayName: 'Magnus Svensson',
        role: 'director', invitedAt: daysAgo(10), response: 'tentative', hasVotingRights: true,
      },
    ],
    quorumRequired: 3,
    agendaItems: [
      {
        id: 'agenda-1', orderIndex: 0, title: 'Mötets öppnande', type: 'formality',
        estimatedDuration: 5, documentIds: [], conflictKeywords: [], recusedMemberIds: [],
        actionItems: [], isConfidential: false, isCompleted: false,
      },
      {
        id: 'agenda-2', orderIndex: 1, title: 'Val av justeringsman', type: 'formality',
        estimatedDuration: 5, documentIds: [], conflictKeywords: [], recusedMemberIds: [],
        actionItems: [], isConfidential: false, isCompleted: false,
      },
      {
        id: 'agenda-3', orderIndex: 2, title: 'Godkännande av dagordning', type: 'formality',
        estimatedDuration: 5, documentIds: [], conflictKeywords: [], recusedMemberIds: [],
        actionItems: [], isConfidential: false, isCompleted: false,
      },
      {
        id: 'agenda-4', orderIndex: 3, title: 'VD-rapport Q1 2026',
        description: 'Genomgång av verksamheten under Q1 med fokus på omsättning, kundtillväxt och pipeline.',
        type: 'information', estimatedDuration: 30, presenterId: 'demo-member-1',
        presenterName: 'Erik Nordström', documentIds: ['demo-doc-1'], conflictKeywords: [],
        recusedMemberIds: [], actionItems: [], isConfidential: false, isCompleted: false,
      },
      {
        id: 'agenda-5', orderIndex: 4, title: 'Finansiell rapport Q1',
        description: 'Resultaträkning, balansräkning och kassaflöde jämfört med budget.',
        type: 'information', estimatedDuration: 25, presenterId: 'demo-member-1',
        presenterName: 'Erik Nordström', documentIds: ['demo-doc-2'], conflictKeywords: [],
        recusedMemberIds: [], actionItems: [], isConfidential: false, isCompleted: false,
      },
      {
        id: 'agenda-6', orderIndex: 5, title: 'Beslut om expansion till Norge',
        description: 'Förslag om att etablera kontor i Oslo med initial investering på 2 MSEK.',
        type: 'decision', estimatedDuration: 40, documentIds: ['demo-doc-3'],
        conflictKeywords: ['Norge', 'expansion', 'Oslo'], recusedMemberIds: [],
        decision: { motion: 'Styrelsen beslutar att godkänna expansion till Norge med budget om 2 MSEK.' },
        actionItems: [], isConfidential: false, isCompleted: false,
      },
      {
        id: 'agenda-7', orderIndex: 6, title: 'Hållbarhetsstrategi 2026–2028',
        description: 'Diskussion kring bolagets hållbarhetsmål och ESG-rapportering.',
        type: 'discussion', estimatedDuration: 30, documentIds: [],
        conflictKeywords: ['Green Energy Solutions'], recusedMemberIds: [],
        actionItems: [], isConfidential: false, isCompleted: false,
      },
      {
        id: 'agenda-8', orderIndex: 7, title: 'Mötets avslutande', type: 'formality',
        estimatedDuration: 5, documentIds: [], conflictKeywords: [], recusedMemberIds: [],
        actionItems: [], isConfidential: false, isCompleted: false,
      },
    ],
    agendaLocked: false,
    documentIds: ['demo-doc-1', 'demo-doc-2', 'demo-doc-3'],
    createdAt: daysAgo(14),
    updatedAt: daysAgo(2),
    createdBy: 'demo-user-3',
    lastModifiedBy: 'demo-user-3',
  },
  // Recently completed meeting
  {
    id: 'demo-meeting-2',
    tenantId: DEMO_TENANT_ID,
    title: 'Extra styrelsemöte – Förvärv',
    description: 'Extraordinärt möte för att besluta om förvärv av TechStart AB.',
    meetingType: 'extraordinary',
    status: 'completed',
    scheduledStart: daysAgo(14),
    scheduledEnd: daysAgo(14),
    actualStart: daysAgo(14),
    actualEnd: daysAgo(14),
    timezone: 'Europe/Stockholm',
    location: {
      type: 'virtual',
      videoConferenceUrl: 'https://teams.microsoft.com/demo2',
      videoConferencePlatform: 'teams',
    },
    attendees: [
      {
        memberId: 'demo-member-1', userId: 'demo-user-1', displayName: 'Erik Nordström',
        role: 'director', invitedAt: daysAgo(21), response: 'accepted',
        attendanceStatus: 'present', hasVotingRights: true,
      },
      {
        memberId: 'demo-member-2', userId: 'demo-user-2', displayName: 'Anna Bergqvist',
        role: 'chair', invitedAt: daysAgo(21), response: 'accepted',
        attendanceStatus: 'present', hasVotingRights: true,
      },
      {
        memberId: 'demo-member-3', userId: 'demo-user-3', displayName: 'Lars Johansson',
        role: 'secretary', invitedAt: daysAgo(21), response: 'accepted',
        attendanceStatus: 'present', hasVotingRights: false,
      },
      {
        memberId: 'demo-member-4', userId: 'demo-user-4', displayName: 'Karin Lindgren',
        role: 'director', invitedAt: daysAgo(21), response: 'accepted',
        attendanceStatus: 'present', hasVotingRights: true,
      },
      {
        memberId: 'demo-member-5', userId: 'demo-user-5', displayName: 'Magnus Svensson',
        role: 'director', invitedAt: daysAgo(21), response: 'declined',
        attendanceStatus: 'absent', hasVotingRights: true,
      },
    ],
    quorumRequired: 3,
    agendaItems: [
      {
        id: 'agenda-e1', orderIndex: 0, title: 'Mötets öppnande', type: 'formality',
        estimatedDuration: 5, documentIds: [], conflictKeywords: [], recusedMemberIds: [],
        actionItems: [], isConfidential: false, isCompleted: true,
      },
      {
        id: 'agenda-e2', orderIndex: 1, title: 'Förvärv av TechStart AB',
        description: 'Beslut om att förvärva 100% av aktierna i TechStart AB för 8 MSEK.',
        type: 'decision', estimatedDuration: 60,
        decision: {
          motion: 'Styrelsen beslutar att förvärva samtliga aktier i TechStart AB för 8 MSEK.',
          outcome: 'approved', votesFor: 3, votesAgainst: 0, abstentions: 0,
          votingMethod: 'show_of_hands',
        },
        documentIds: ['demo-doc-4'], conflictKeywords: ['TechStart', 'TechVenture'],
        recusedMemberIds: ['demo-member-2'],
        actionItems: [
          {
            id: 'action-1', title: 'Upprätta aktieöverlåtelseavtal',
            assigneeId: 'demo-member-1', assigneeName: 'Erik Nordström',
            dueDate: daysAgo(7), status: 'completed', completedAt: daysAgo(8),
            createdAt: daysAgo(14),
          },
          {
            id: 'action-2', title: 'Genomföra due diligence slutrapport',
            assigneeId: 'demo-member-4', assigneeName: 'Karin Lindgren',
            dueDate: daysFromNow(7), status: 'in_progress',
            createdAt: daysAgo(14),
          },
        ],
        isConfidential: true, isCompleted: true,
      },
      {
        id: 'agenda-e3', orderIndex: 2, title: 'Mötets avslutande', type: 'formality',
        estimatedDuration: 5, documentIds: [], conflictKeywords: [], recusedMemberIds: [],
        actionItems: [], isConfidential: false, isCompleted: true,
      },
    ],
    agendaLocked: true,
    agendaLockedAt: daysAgo(15),
    agendaLockedBy: 'demo-user-3',
    minutes: {
      id: 'demo-minutes-2',
      meetingId: 'demo-meeting-2',
      tenantId: DEMO_TENANT_ID,
      version: 1,
      status: 'signed',
      header: {
        meetingNumber: '2026-E1',
        meetingDate: daysAgo(14),
        location: 'Microsoft Teams (video)',
        callToOrder: daysAgo(14),
        adjournment: daysAgo(14),
      },
      attendance: {
        present: ['Erik Nordström', 'Anna Bergqvist', 'Lars Johansson', 'Karin Lindgren'],
        absent: ['Magnus Svensson'],
        excused: ['Magnus Svensson'],
        guests: [],
      },
      itemMinutes: [
        {
          agendaItemId: 'agenda-e1', orderIndex: 0, title: 'Mötets öppnande',
          type: 'formality', discussion: 'Ordföranden förklarade mötet öppnat kl. 14:00.',
          actionItems: [],
        },
        {
          agendaItemId: 'agenda-e2', orderIndex: 1, title: 'Förvärv av TechStart AB',
          type: 'decision',
          discussion: 'VD presenterade det slutliga förslaget om förvärv av TechStart AB. Anna Bergqvist anmälde jäv p.g.a. koppling till TechVenture Nordic AB och deltog ej i beslutet. Styrelsen diskuterade värdering, synergieffekter och integrationsstrategi.',
          decision: {
            motion: 'Styrelsen beslutar att förvärva samtliga aktier i TechStart AB för 8 MSEK.',
            outcome: 'approved', votesFor: 3, votesAgainst: 0, abstentions: 0,
          },
          actionItems: [
            {
              id: 'action-1', title: 'Upprätta aktieöverlåtelseavtal',
              assigneeName: 'Erik Nordström', status: 'completed', createdAt: daysAgo(14),
            },
          ],
          recusals: [
            {
              memberId: 'demo-member-2', memberName: 'Anna Bergqvist',
              reason: 'Styrelseledamot i TechVenture Nordic AB, som har affärsrelation med TechStart.',
            },
          ],
        },
      ],
      signatures: [
        {
          signerId: 'demo-member-2', signerName: 'Anna Bergqvist', signerRole: 'chair',
          status: 'signed', signedAt: daysAgo(12), signatureMethod: 'bankid',
          signatureTransactionId: 'bankid-tx-001',
        },
        {
          signerId: 'demo-member-4', signerName: 'Karin Lindgren', signerRole: 'adjuster',
          status: 'signed', signedAt: daysAgo(11), signatureMethod: 'bankid',
          signatureTransactionId: 'bankid-tx-002',
        },
      ],
      createdAt: daysAgo(13),
      updatedAt: daysAgo(11),
      createdBy: 'demo-user-3',
      lastModifiedBy: 'demo-user-3',
    },
    documentIds: ['demo-doc-4'],
    createdAt: daysAgo(21),
    updatedAt: daysAgo(11),
    createdBy: 'demo-user-3',
    lastModifiedBy: 'demo-user-3',
  },
  // Older completed meeting
  {
    id: 'demo-meeting-3',
    tenantId: DEMO_TENANT_ID,
    title: 'Styrelsemöte Q4 2025',
    description: 'Ordinarie styrelsemöte för Q4 2025 med bokslutsdiskussion.',
    meetingType: 'ordinary',
    status: 'completed',
    scheduledStart: daysAgo(90),
    scheduledEnd: daysAgo(90),
    actualStart: daysAgo(90),
    actualEnd: daysAgo(90),
    timezone: 'Europe/Stockholm',
    location: {
      type: 'physical',
      address: 'Kungsgatan 42, Stockholm',
      room: 'Boardroom A',
    },
    attendees: [
      {
        memberId: 'demo-member-1', userId: 'demo-user-1', displayName: 'Erik Nordström',
        role: 'director', invitedAt: daysAgo(100), response: 'accepted',
        attendanceStatus: 'present', hasVotingRights: true,
      },
      {
        memberId: 'demo-member-2', userId: 'demo-user-2', displayName: 'Anna Bergqvist',
        role: 'chair', invitedAt: daysAgo(100), response: 'accepted',
        attendanceStatus: 'present', hasVotingRights: true,
      },
      {
        memberId: 'demo-member-3', userId: 'demo-user-3', displayName: 'Lars Johansson',
        role: 'secretary', invitedAt: daysAgo(100), response: 'accepted',
        attendanceStatus: 'present', hasVotingRights: false,
      },
      {
        memberId: 'demo-member-4', userId: 'demo-user-4', displayName: 'Karin Lindgren',
        role: 'director', invitedAt: daysAgo(100), response: 'accepted',
        attendanceStatus: 'present', hasVotingRights: true,
      },
      {
        memberId: 'demo-member-5', userId: 'demo-user-5', displayName: 'Magnus Svensson',
        role: 'director', invitedAt: daysAgo(100), response: 'accepted',
        attendanceStatus: 'present', hasVotingRights: true,
      },
    ],
    quorumRequired: 3,
    agendaItems: [
      {
        id: 'agenda-q4-1', orderIndex: 0, title: 'Mötets öppnande', type: 'formality',
        estimatedDuration: 5, documentIds: [], conflictKeywords: [], recusedMemberIds: [],
        actionItems: [], isConfidential: false, isCompleted: true,
      },
      {
        id: 'agenda-q4-2', orderIndex: 1, title: 'Bokslutsrapport 2025', type: 'information',
        estimatedDuration: 30, documentIds: ['demo-doc-2'], conflictKeywords: [],
        recusedMemberIds: [], actionItems: [], isConfidential: false, isCompleted: true,
      },
      {
        id: 'agenda-q4-3', orderIndex: 2, title: 'Budget 2026', type: 'decision',
        estimatedDuration: 45,
        decision: {
          motion: 'Styrelsen fastställer budget för verksamhetsåret 2026.',
          outcome: 'approved', votesFor: 4, votesAgainst: 0, abstentions: 0,
          votingMethod: 'unanimous',
        },
        documentIds: [], conflictKeywords: [], recusedMemberIds: [],
        actionItems: [], isConfidential: false, isCompleted: true,
      },
      {
        id: 'agenda-q4-4', orderIndex: 3, title: 'Mötets avslutande', type: 'formality',
        estimatedDuration: 5, documentIds: [], conflictKeywords: [], recusedMemberIds: [],
        actionItems: [], isConfidential: false, isCompleted: true,
      },
    ],
    agendaLocked: true,
    documentIds: ['demo-doc-2'],
    createdAt: daysAgo(100),
    updatedAt: daysAgo(88),
    createdBy: 'demo-user-3',
    lastModifiedBy: 'demo-user-3',
  },
  // Future AGM
  {
    id: 'demo-meeting-4',
    tenantId: DEMO_TENANT_ID,
    title: 'Årsstämma 2026',
    description: 'Ordinarie bolagsstämma för räkenskapsåret 2025.',
    meetingType: 'annual_general',
    status: 'draft',
    scheduledStart: daysFromNow(45),
    scheduledEnd: hoursFromNow(45 * 24 + 4),
    timezone: 'Europe/Stockholm',
    location: {
      type: 'physical',
      address: 'Kungsgatan 42, Stockholm',
      room: 'Conference Hall',
    },
    attendees: [],
    quorumRequired: 3,
    agendaItems: [],
    agendaLocked: false,
    documentIds: [],
    createdAt: daysAgo(7),
    updatedAt: daysAgo(7),
    createdBy: 'demo-user-3',
    lastModifiedBy: 'demo-user-3',
  },
];

// ============================================================================
// DEMO DOCUMENTS
// ============================================================================

export const demoDocuments: Document[] = [
  {
    id: 'demo-doc-1',
    tenantId: DEMO_TENANT_ID,
    name: 'VD-rapport Q1 2026.pdf',
    description: 'Kvartalsrapport från verkställande direktören med verksamhetsöversikt.',
    category: 'board_pack',
    mimeType: 'application/pdf',
    size: 2456000,
    storagePath: '/demo/vd-rapport-q1-2026.pdf',
    version: 1,
    visibility: 'internal',
    meetingIds: ['demo-meeting-1'],
    agendaItemIds: ['agenda-4'],
    tags: ['Q1', '2026', 'VD-rapport', 'kvartalsrapport'],
    createdAt: daysAgo(5),
    updatedAt: daysAgo(5),
    uploadedBy: 'demo-user-1',
    isArchived: false,
  },
  {
    id: 'demo-doc-2',
    tenantId: DEMO_TENANT_ID,
    name: 'Finansiell rapport Q1 2026.xlsx',
    description: 'Resultaträkning, balansräkning och kassaflöde med budgetjämförelse.',
    category: 'financial',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    size: 890000,
    storagePath: '/demo/finansiell-rapport-q1-2026.xlsx',
    version: 2,
    previousVersionId: 'demo-doc-2-v1',
    visibility: 'internal',
    meetingIds: ['demo-meeting-1'],
    agendaItemIds: ['agenda-5'],
    tags: ['Q1', '2026', 'finansiell', 'resultaträkning', 'balansräkning'],
    createdAt: daysAgo(7),
    updatedAt: daysAgo(3),
    uploadedBy: 'demo-user-1',
    isArchived: false,
  },
  {
    id: 'demo-doc-3',
    tenantId: DEMO_TENANT_ID,
    name: 'Expansionsplan Norge 2026.pdf',
    description: 'Affärsplan och budget för etablering av kontor i Oslo.',
    category: 'board_pack',
    mimeType: 'application/pdf',
    size: 3200000,
    storagePath: '/demo/expansionsplan-norge-2026.pdf',
    version: 1,
    visibility: 'confidential',
    meetingIds: ['demo-meeting-1'],
    agendaItemIds: ['agenda-6'],
    tags: ['expansion', 'Norge', 'Oslo', 'strategi'],
    createdAt: daysAgo(10),
    updatedAt: daysAgo(10),
    uploadedBy: 'demo-user-1',
    isArchived: false,
  },
  {
    id: 'demo-doc-4',
    tenantId: DEMO_TENANT_ID,
    name: 'Due Diligence - TechStart AB.pdf',
    description: 'Fullständig due diligence rapport för förvärvet av TechStart AB.',
    category: 'contract',
    mimeType: 'application/pdf',
    size: 5600000,
    storagePath: '/demo/due-diligence-techstart.pdf',
    version: 1,
    visibility: 'confidential',
    meetingIds: ['demo-meeting-2'],
    agendaItemIds: ['agenda-e2'],
    tags: ['förvärv', 'TechStart', 'due diligence'],
    createdAt: daysAgo(25),
    updatedAt: daysAgo(25),
    uploadedBy: 'demo-user-1',
    isArchived: false,
  },
  {
    id: 'demo-doc-5',
    tenantId: DEMO_TENANT_ID,
    name: 'Bolagspolicy 2025.pdf',
    description: 'Bolagsstyrningspolicy antagen av styrelsen.',
    category: 'policy',
    mimeType: 'application/pdf',
    size: 1100000,
    storagePath: '/demo/bolagspolicy-2025.pdf',
    version: 3,
    visibility: 'internal',
    meetingIds: [],
    agendaItemIds: [],
    tags: ['policy', 'bolagsstyrning', 'governance'],
    createdAt: daysAgo(180),
    updatedAt: daysAgo(30),
    uploadedBy: 'demo-user-3',
    isArchived: false,
  },
  {
    id: 'demo-doc-6',
    tenantId: DEMO_TENANT_ID,
    name: 'Protokoll styrelsemöte Q4 2025.pdf',
    description: 'Signerade mötesprotokoll från styrelsemötet Q4 2025.',
    category: 'minutes',
    mimeType: 'application/pdf',
    size: 420000,
    storagePath: '/demo/protokoll-q4-2025.pdf',
    version: 1,
    visibility: 'internal',
    meetingIds: ['demo-meeting-3'],
    agendaItemIds: [],
    tags: ['protokoll', 'Q4', '2025', 'signerat'],
    createdAt: daysAgo(85),
    updatedAt: daysAgo(85),
    uploadedBy: 'demo-user-3',
    isArchived: false,
  },
];

// ============================================================================
// DEMO FINANCIAL PERIODS
// ============================================================================

function makeFinancialPeriod(
  id: string,
  period: string,
  fiscalYear: number,
  revenue: number,
  cogs: number,
  opex: number,
  budgetRevenue: number,
  budgetOpex: number,
  budgetNet: number,
): FinancialPeriod {
  const grossProfit = revenue - cogs;
  const operatingIncome = grossProfit - opex;
  const interestExpense = revenue * 0.005;
  const taxExpense = Math.max(0, operatingIncome - interestExpense) * 0.206;
  const netIncome = operatingIncome - interestExpense - taxExpense;
  const totalAssets = revenue * 2.5;
  const totalLiabilities = totalAssets * 0.4;
  const totalEquity = totalAssets - totalLiabilities;

  return {
    id,
    tenantId: DEMO_TENANT_ID,
    period,
    periodType: 'monthly',
    fiscalYear,
    incomeStatement: {
      revenue,
      costOfGoodsSold: cogs,
      grossProfit,
      operatingExpenses: opex,
      operatingIncome,
      interestExpense,
      interestIncome: 0,
      otherIncome: 0,
      otherExpenses: 0,
      taxExpense,
      netIncome,
    },
    balanceSheet: {
      cashAndEquivalents: revenue * 0.35,
      accountsReceivable: revenue * 0.25,
      inventory: revenue * 0.1,
      prepaidExpenses: revenue * 0.05,
      otherCurrentAssets: 0,
      totalCurrentAssets: revenue * 0.75,
      propertyPlantEquipment: revenue * 0.8,
      intangibleAssets: revenue * 0.6,
      longTermInvestments: revenue * 0.2,
      otherNonCurrentAssets: revenue * 0.15,
      totalNonCurrentAssets: revenue * 1.75,
      totalAssets,
      accountsPayable: revenue * 0.15,
      shortTermDebt: revenue * 0.05,
      accruedLiabilities: revenue * 0.08,
      otherCurrentLiabilities: revenue * 0.02,
      totalCurrentLiabilities: revenue * 0.3,
      longTermDebt: totalLiabilities - revenue * 0.3,
      deferredTaxLiabilities: 0,
      otherNonCurrentLiabilities: 0,
      totalNonCurrentLiabilities: totalLiabilities - revenue * 0.3,
      totalLiabilities,
      commonStock: totalEquity * 0.3,
      retainedEarnings: totalEquity * 0.65,
      otherEquity: totalEquity * 0.05,
      totalEquity,
    },
    cashFlow: {
      operatingCashFlow: netIncome * 1.2,
      investingCashFlow: -revenue * 0.1,
      financingCashFlow: -revenue * 0.02,
      netCashFlow: netIncome * 1.2 - revenue * 0.1 - revenue * 0.02,
      beginningCash: revenue * 0.3,
      endingCash: revenue * 0.35,
    },
    kpis: {
      grossMargin: (grossProfit / revenue) * 100,
      operatingMargin: (operatingIncome / revenue) * 100,
      netMargin: (netIncome / revenue) * 100,
      ebitda: operatingIncome + revenue * 0.05,
      ebitdaMargin: ((operatingIncome + revenue * 0.05) / revenue) * 100,
      currentRatio: (revenue * 0.75) / (revenue * 0.3),
      quickRatio: (revenue * 0.6) / (revenue * 0.3),
      debtToEquity: totalLiabilities / totalEquity,
      returnOnEquity: (netIncome / totalEquity) * 100,
      returnOnAssets: (netIncome / totalAssets) * 100,
      workingCapital: revenue * 0.75 - revenue * 0.3,
    },
    budget: {
      revenue: budgetRevenue,
      operatingExpenses: budgetOpex,
      netIncome: budgetNet,
    },
    source: 'fortnox',
    sourceMetadata: {
      importedAt: daysAgo(2),
      importedBy: 'demo-user-1',
      erpConnectionId: 'demo-erp-1',
      lastSyncAt: daysAgo(1),
    },
    status: 'final',
    createdAt: daysAgo(5),
    updatedAt: daysAgo(2),
    createdBy: 'demo-user-1',
  };
}

export const demoFinancials: FinancialPeriod[] = [
  makeFinancialPeriod('demo-fin-01', '2026-01', 2026, 4200000, 1680000, 1800000, 4000000, 1750000, 500000),
  makeFinancialPeriod('demo-fin-02', '2026-02', 2026, 4500000, 1800000, 1850000, 4100000, 1800000, 520000),
  makeFinancialPeriod('demo-fin-03', '2026-03', 2026, 4800000, 1920000, 1900000, 4300000, 1850000, 560000),
  makeFinancialPeriod('demo-fin-12', '2025-12', 2025, 3800000, 1520000, 1750000, 3900000, 1700000, 480000),
  makeFinancialPeriod('demo-fin-11', '2025-11', 2025, 3600000, 1440000, 1700000, 3700000, 1680000, 460000),
  makeFinancialPeriod('demo-fin-10', '2025-10', 2025, 3500000, 1400000, 1680000, 3600000, 1650000, 440000),
  makeFinancialPeriod('demo-fin-09', '2025-09', 2025, 3400000, 1360000, 1650000, 3500000, 1620000, 420000),
  makeFinancialPeriod('demo-fin-08', '2025-08', 2025, 2800000, 1120000, 1500000, 3200000, 1550000, 380000),
  makeFinancialPeriod('demo-fin-07', '2025-07', 2025, 2600000, 1040000, 1450000, 3000000, 1500000, 350000),
  makeFinancialPeriod('demo-fin-06', '2025-06', 2025, 3300000, 1320000, 1600000, 3400000, 1580000, 400000),
  makeFinancialPeriod('demo-fin-05', '2025-05', 2025, 3200000, 1280000, 1580000, 3300000, 1560000, 390000),
  makeFinancialPeriod('demo-fin-04', '2025-04', 2025, 3100000, 1240000, 1550000, 3200000, 1540000, 380000),
];

// ============================================================================
// DEMO DECISIONS
// ============================================================================

export const demoDecisions: Decision[] = [
  {
    id: 'demo-decision-1',
    tenantId: DEMO_TENANT_ID,
    meetingId: 'demo-meeting-2',
    agendaItemId: 'agenda-e2',
    decisionNumber: '2026-001',
    title: 'Förvärv av TechStart AB',
    description: 'Beslut om att förvärva 100% av aktierna i TechStart AB.',
    motion: 'Styrelsen beslutar att förvärva samtliga aktier i TechStart AB för 8 MSEK.',
    outcome: 'approved',
    votingMethod: 'show_of_hands',
    votesFor: 3,
    votesAgainst: 0,
    abstentions: 0,
    participantIds: ['demo-member-1', 'demo-member-4', 'demo-member-5'],
    recusedMemberIds: ['demo-member-2'],
    actionItems: [
      {
        id: 'action-d1', title: 'Slutföra aktieöverlåtelseavtal',
        assigneeId: 'demo-member-1', assigneeName: 'Erik Nordström',
        dueDate: daysAgo(7), status: 'completed', completedAt: daysAgo(8), createdAt: daysAgo(14),
      },
      {
        id: 'action-d2', title: 'Genomföra due diligence slutrapport',
        assigneeId: 'demo-member-4', assigneeName: 'Karin Lindgren',
        dueDate: daysFromNow(7), status: 'in_progress', createdAt: daysAgo(14),
      },
    ],
    implementationDeadline: daysFromNow(30),
    implementationStatus: 'in_progress',
    relatedDocumentIds: ['demo-doc-4'],
    relatedDecisionIds: [],
    decidedAt: daysAgo(14),
    recordedBy: 'demo-user-3',
    createdAt: daysAgo(14),
    updatedAt: daysAgo(8),
  },
  {
    id: 'demo-decision-2',
    tenantId: DEMO_TENANT_ID,
    meetingId: 'demo-meeting-3',
    agendaItemId: 'agenda-q4-3',
    decisionNumber: '2025-008',
    title: 'Budget 2026',
    description: 'Fastställande av budget för verksamhetsåret 2026.',
    motion: 'Styrelsen fastställer budget för verksamhetsåret 2026 med en omsättning om 50 MSEK och ett resultat om 6 MSEK.',
    outcome: 'approved',
    votingMethod: 'unanimous',
    votesFor: 4,
    votesAgainst: 0,
    abstentions: 0,
    participantIds: ['demo-member-1', 'demo-member-2', 'demo-member-4', 'demo-member-5'],
    recusedMemberIds: [],
    actionItems: [],
    implementationStatus: 'completed',
    relatedDocumentIds: [],
    relatedDecisionIds: [],
    decidedAt: daysAgo(90),
    recordedBy: 'demo-user-3',
    createdAt: daysAgo(90),
    updatedAt: daysAgo(90),
  },
  {
    id: 'demo-decision-3',
    tenantId: DEMO_TENANT_ID,
    meetingId: 'demo-meeting-3',
    agendaItemId: 'agenda-q4-2',
    decisionNumber: '2025-007',
    title: 'Godkännande av årsredovisning 2025',
    description: 'Styrelsen godkänner årsredovisningen för räkenskapsåret 2025.',
    motion: 'Styrelsen godkänner årsredovisningen och föreslår att vinsten balanseras i ny räkning.',
    outcome: 'approved',
    votingMethod: 'unanimous',
    votesFor: 4,
    votesAgainst: 0,
    abstentions: 0,
    participantIds: ['demo-member-1', 'demo-member-2', 'demo-member-4', 'demo-member-5'],
    recusedMemberIds: [],
    actionItems: [
      {
        id: 'action-d3', title: 'Skicka årsredovisning till Bolagsverket',
        assigneeId: 'demo-member-3', assigneeName: 'Lars Johansson',
        dueDate: daysAgo(60), status: 'completed', completedAt: daysAgo(65), createdAt: daysAgo(90),
      },
    ],
    implementationStatus: 'completed',
    relatedDocumentIds: [],
    relatedDecisionIds: [],
    decidedAt: daysAgo(90),
    recordedBy: 'demo-user-3',
    createdAt: daysAgo(90),
    updatedAt: daysAgo(60),
  },
];

// ============================================================================
// DEMO DATA DISPLAY NAMES (for member lookups)
// ============================================================================

export const demoMemberNames: Record<string, string> = {
  'demo-user-1': 'Erik Nordström',
  'demo-user-2': 'Anna Bergqvist',
  'demo-user-3': 'Lars Johansson',
  'demo-user-4': 'Karin Lindgren',
  'demo-user-5': 'Magnus Svensson',
  'demo-user-6': 'Henrik Andersson',
  'demo-user-7': 'Sofia Ekström',
};

// ============================================================================
// HELPER: Check if a tenant ID is the demo tenant
// ============================================================================

export function isDemoTenant(tenantId: string | null): boolean {
  return tenantId === DEMO_TENANT_ID;
}
