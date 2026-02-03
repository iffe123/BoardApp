# CLAUDE.md - GovernanceOS Development Guide

## Project Overview

**GovernanceOS** is an AI-native board governance platform targeting the Nordic market, designed to compete with Boardeaser, OnBoard, Boardable, and Diligent. The platform combines traditional board portal functions with deep financial reporting, AI-powered features, and Swedish corporate governance compliance.

### Repository
- **GitHub**: https://github.com/iffe123/BoardApp
- **Live Demo**: https://board-app-alpha.vercel.app

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript (strict mode) |
| **Styling** | Tailwind CSS + Shadcn/UI + Radix UI |
| **Icons** | Lucide React |
| **Backend** | Firebase (Firestore, Authentication, Storage, Cloud Functions) |
| **Hosting** | Vercel (Edge Functions, Serverless) |
| **AI** | Anthropic Claude 3.5/4 Sonnet via Vercel AI SDK |
| **State** | Zustand (client), React Query / TanStack Query (server) |
| **Charts** | Recharts |
| **Drag & Drop** | @dnd-kit |
| **Digital Signatures** | BankID (Swedish eID) |

---

## Project Structure

```
BoardApp/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── api/                  # API Routes
│   │   │   ├── ai/               # AI endpoints
│   │   │   │   ├── generate-minutes/
│   │   │   │   ├── analyze-financials/
│   │   │   │   └── summarize-document/
│   │   │   ├── bankid/           # BankID signing endpoints
│   │   │   ├── webhooks/         # External integrations
│   │   │   └── cron/             # Scheduled tasks
│   │   ├── (auth)/               # Auth pages (login, register, reset)
│   │   ├── (dashboard)/          # Protected dashboard routes
│   │   │   ├── meetings/         # Meeting management
│   │   │   ├── financials/       # Financial dashboards
│   │   │   ├── documents/        # Document center
│   │   │   ├── compliance/       # Jäv, signatures, audit log
│   │   │   ├── members/          # Board member management
│   │   │   └── settings/         # Organization settings
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/                   # Shadcn/UI base components
│   │   ├── meetings/             # Meeting-specific components
│   │   │   ├── agenda-builder.tsx
│   │   │   ├── minutes-editor.tsx
│   │   │   ├── decision-register.tsx
│   │   │   └── action-items.tsx
│   │   ├── financial/            # Financial dashboard components
│   │   │   ├── financial-dashboard.tsx
│   │   │   ├── kpi-cards.tsx
│   │   │   ├── rolling-12-chart.tsx
│   │   │   └── variance-analysis.tsx
│   │   ├── documents/            # Document management
│   │   ├── compliance/           # Nordic compliance components
│   │   │   ├── conflict-detector.tsx
│   │   │   ├── bankid-signer.tsx
│   │   │   └── audit-trail.tsx
│   │   ├── client-manager/       # Multi-org management
│   │   └── layout/               # Navigation, sidebar, header
│   ├── contexts/                 # React contexts
│   │   ├── auth-context.tsx
│   │   ├── organization-context.tsx
│   │   └── meeting-context.tsx
│   ├── hooks/                    # Custom React hooks
│   │   ├── use-auth.ts
│   │   ├── use-organization.ts
│   │   ├── use-meetings.ts
│   │   └── use-financials.ts
│   ├── lib/                      # Utility libraries
│   │   ├── firebase.ts           # Firebase config & helpers
│   │   ├── utils.ts              # General utilities (cn, formatDate, etc.)
│   │   ├── signature-service.ts  # BankID integration
│   │   └── ai-service.ts         # Claude AI wrapper
│   └── types/
│       ├── schema.ts             # Firestore data models
│       ├── meeting.ts
│       ├── financial.ts
│       └── member.ts
├── functions/                    # Firebase Cloud Functions
├── firestore.rules               # Security rules
├── .env.example
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Core Features to Implement

### 1. Meeting Management System

**Agenda Builder** (Priority: HIGH)
- Drag-and-drop agenda items using @dnd-kit
- Polymorphic item types: `Information`, `Decision`, `Discussion`, `Formality`
- Time allocation per item with automatic scheduling
- Presenter assignment from board members
- Linked documents/attachments per agenda item
- Template support (save/load agenda templates)

```typescript
// types/meeting.ts
interface AgendaItem {
  id: string;
  type: 'information' | 'decision' | 'discussion' | 'formality';
  title: string;
  description?: string;
  presenter?: MemberId;
  duration: number; // minutes
  attachments: DocumentRef[];
  order: number;
  // For decision items
  motion?: string;
  votes?: VoteRecord[];
  // For compliance
  conflicts?: ConflictOfInterest[];
}
```

**AI Minutes Generation** (Priority: HIGH)
- POST `/api/ai/generate-minutes`
- Input: Agenda items, notes, attendees, decisions
- Output: Formatted meeting minutes in Swedish/English
- Support for formal Swedish protocol format
- Decision register auto-population
- Action item extraction with owners and deadlines

**Adjuster Workflow (Justeringsman)** (Priority: MEDIUM)
- Swedish-compliant minute verification
- Two adjusters required by Swedish Companies Act
- BankID signature collection
- Status tracking: Draft → Pending Review → Signed → Archived

### 2. Financial Intelligence Dashboard

**Rolling 12-Month Analytics** (Priority: HIGH)
- Interactive Recharts visualizations
- P&L, Balance Sheet, Cash Flow views
- Comparison: Actual vs Budget vs Previous Year
- Drill-down capabilities

**ERP Integration** (Priority: HIGH)
- Fortnox API integration (primary)
- Visma integration (secondary)
- SIE4 file import support
- Automatic data sync scheduling

```typescript
// types/financial.ts
interface FinancialPeriod {
  id: string;
  organizationId: string;
  year: number;
  month: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  operatingExpenses: number;
  ebitda: number;
  netIncome: number;
  assets: number;
  liabilities: number;
  equity: number;
  cashFlow: number;
  budgetVariance: Record<string, number>;
  kpis: KPISet;
}
```

**AI Financial Analysis** (Priority: MEDIUM)
- POST `/api/ai/analyze-financials`
- Automated variance explanations
- Trend identification
- Risk flagging
- Board-ready narrative summaries

### 3. Document Management

**Document Center** (Priority: HIGH)
- Firebase Storage integration
- Folder structure per organization
- Version control with history
- Full-text search (Algolia or Firebase extensions)
- Access controls per document

**Read Confirmations** (Priority: MEDIUM)
- Track who opened what and when
- Engagement analytics for admins
- Reminder automation for unread documents

**Annotations** (Priority: LOW)
- In-document commenting
- Highlight and note functionality
- Collaborative annotations

### 4. Nordic Compliance Module

**Jäv Detection (Conflict of Interest)** (Priority: HIGH)
- Automatic conflict identification based on:
  - Agenda item keywords vs member profiles
  - Company relationships
  - Family connections
- Recusal workflow with documentation
- Audit trail for compliance

```typescript
// components/compliance/conflict-detector.tsx
interface ConflictDetectorProps {
  agendaItem: AgendaItem;
  members: BoardMember[];
  currentUserId: string;
  onRecuse: (memberId: string, reason: string) => void;
}
```

**BankID Integration** (Priority: HIGH)
- Swedish BankID for digital signatures
- eIDAS Advanced Electronic Signature compliant
- Sign minutes, resolutions, documents
- Batch signing support

**Share Registry (Aktiebok)** (Priority: MEDIUM)
- Digital ownership records
- Transaction history
- Cap table visualization
- Export for authority filings

### 5. Multi-Tenant Architecture

**Client Manager** (Priority: HIGH)
- For accounting firms managing multiple organizations
- Organization switcher in UI
- Aggregated dashboards across clients
- Billing per organization

**Role-Based Access Control** (Priority: HIGH)
```typescript
type MemberRole =
  | 'owner'      // Full access, billing
  | 'admin'      // Full access except billing
  | 'secretary'  // Meeting management, documents
  | 'chair'      // Meeting control, decisions
  | 'director'   // Standard board member
  | 'observer'   // Read-only access
  | 'auditor';   // Read-only + compliance reports
```

**Firebase Custom Claims** (Priority: HIGH)
```typescript
// Custom claims structure
interface UserClaims {
  organizations: {
    [orgId: string]: {
      role: MemberRole;
      committees?: string[];
    }
  };
  activeOrganization: string;
}
```

---

## API Endpoints

### AI Endpoints

```typescript
// POST /api/ai/generate-minutes
interface GenerateMinutesRequest {
  meetingId: string;
  agendaItems: AgendaItem[];
  attendees: Attendee[];
  notes: string;
  language: 'sv' | 'en';
}

// POST /api/ai/analyze-financials
interface AnalyzeFinancialsRequest {
  organizationId: string;
  periods: FinancialPeriod[];
  focusAreas?: ('revenue' | 'costs' | 'margins' | 'cash')[];
  compareTobudget?: boolean;
}

// POST /api/ai/summarize-document
interface SummarizeDocumentRequest {
  documentId: string;
  maxLength?: number;
  language: 'sv' | 'en';
}
```

### BankID Endpoints

```typescript
// POST /api/bankid/sign
interface BankIDSignRequest {
  documentId: string;
  userId: string;
  personalNumber?: string; // Swedish SSN
  userVisibleData: string;
}

// GET /api/bankid/collect/:orderRef
// Returns signing status and completion data
```

---

## Firestore Data Models

### Organizations Collection
```typescript
// /organizations/{orgId}
interface Organization {
  id: string;
  name: string;
  orgNumber: string; // Swedish org number
  type: 'AB' | 'Ek.för' | 'Stiftelse' | 'other';
  fiscalYearEnd: number; // Month (1-12)
  settings: OrganizationSettings;
  erpConnection?: ERPConnection;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Meetings Collection
```typescript
// /organizations/{orgId}/meetings/{meetingId}
interface Meeting {
  id: string;
  title: string;
  type: 'board' | 'agm' | 'egm' | 'committee';
  scheduledAt: Timestamp;
  location: string | 'remote';
  status: 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'archived';
  agenda: AgendaItem[];
  attendees: Attendee[];
  minutes?: Minutes;
  recordings?: string[]; // Storage URLs
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Members Collection
```typescript
// /organizations/{orgId}/members/{memberId}
interface BoardMember {
  id: string;
  userId: string;
  role: MemberRole;
  personalNumber?: string; // For BankID
  email: string;
  name: string;
  title?: string; // "Styrelseledamot", "VD", etc.
  committees: string[];
  joinedAt: Timestamp;
  relationships: Relationship[]; // For Jäv detection
}
```

---

## Security Rules (Firestore)

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }

    function hasOrgAccess(orgId) {
      return isAuthenticated() &&
        orgId in request.auth.token.organizations;
    }

    function hasRole(orgId, roles) {
      return hasOrgAccess(orgId) &&
        request.auth.token.organizations[orgId].role in roles;
    }

    function isOrgAdmin(orgId) {
      return hasRole(orgId, ['owner', 'admin']);
    }

    // Organizations
    match /organizations/{orgId} {
      allow read: if hasOrgAccess(orgId);
      allow write: if isOrgAdmin(orgId);

      // Meetings subcollection
      match /meetings/{meetingId} {
        allow read: if hasOrgAccess(orgId);
        allow create: if hasRole(orgId, ['owner', 'admin', 'secretary']);
        allow update: if hasRole(orgId, ['owner', 'admin', 'secretary', 'chair']);
        allow delete: if isOrgAdmin(orgId);
      }

      // Members subcollection
      match /members/{memberId} {
        allow read: if hasOrgAccess(orgId);
        allow write: if isOrgAdmin(orgId);
      }

      // Financial periods
      match /financials/{periodId} {
        allow read: if hasOrgAccess(orgId);
        allow write: if hasRole(orgId, ['owner', 'admin']);
      }

      // Documents
      match /documents/{docId} {
        allow read: if hasOrgAccess(orgId);
        allow create: if hasRole(orgId, ['owner', 'admin', 'secretary']);
        allow update, delete: if isOrgAdmin(orgId);
      }
    }

    // User profiles (private)
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
  }
}
```

---

## Environment Variables

```bash
# .env.local

# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (server-side)
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=

# Anthropic AI
ANTHROPIC_API_KEY=

# BankID
BANKID_API_URL=https://appapi2.test.bankid.com/rp/v6.0
BANKID_PFX_PATH=
BANKID_PFX_PASSPHRASE=
BANKID_CA_PATH=

# ERP Integrations
FORTNOX_CLIENT_ID=
FORTNOX_CLIENT_SECRET=
VISMA_API_KEY=

# Optional
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Development Commands

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Testing
npm run test
npm run test:watch
npm run test:coverage

# Build
npm run build

# Firebase
firebase deploy --only firestore:rules
firebase deploy --only functions
firebase emulators:start

# Database seeding (development)
npm run seed
```

---

## Coding Standards

### TypeScript
- Strict mode enabled
- No `any` types - use `unknown` or proper typing
- Prefer interfaces over types for objects
- Use discriminated unions for polymorphic types

### React Components
- Functional components only
- Use React Server Components where possible
- Client components marked with `'use client'`
- Props interfaces defined above component
- Destructure props in function signature

```typescript
// Good example
interface MeetingCardProps {
  meeting: Meeting;
  onSelect: (id: string) => void;
  isSelected?: boolean;
}

export function MeetingCard({ meeting, onSelect, isSelected = false }: MeetingCardProps) {
  // ...
}
```

### Styling
- Tailwind CSS for all styling
- Use `cn()` utility for conditional classes
- Shadcn/UI components as base
- No inline styles or CSS modules

### File Naming
- Components: `PascalCase.tsx` (e.g., `AgendaBuilder.tsx`)
- Utilities/hooks: `kebab-case.ts` (e.g., `use-meetings.ts`)
- Types: `kebab-case.ts` in `/types` folder

### Imports
- Absolute imports via `@/` alias
- Group imports: React, external libs, internal components, types

---

## Performance Guidelines

1. **Server Components**: Default to RSC, use `'use client'` sparingly
2. **Data Fetching**: Use React Query for client-side, RSC for initial load
3. **Images**: Use `next/image` with proper sizing
4. **Bundle Size**: Dynamic imports for heavy components (charts, editors)
5. **Firestore**:
   - Use compound indexes for complex queries
   - Implement pagination for lists
   - Cache frequently accessed data

---

## Testing Strategy

### Unit Tests (Jest + React Testing Library)
- Components: Render tests, interaction tests
- Hooks: Return value tests, side effect tests
- Utilities: Pure function tests

### Integration Tests
- API routes with mocked Firebase
- Full user flows with Testing Library

### E2E Tests (Playwright - optional)
- Critical user journeys
- Cross-browser testing

---

## Deployment

### Vercel
- Automatic deployments from `main` branch
- Preview deployments for PRs
- Environment variables in Vercel dashboard

### Firebase
- Deploy rules: `firebase deploy --only firestore:rules`
- Deploy functions: `firebase deploy --only functions`

---

## Roadmap Priorities

### Phase 1: Core Meeting Management (MVP)
1. Authentication with Firebase
2. Organization setup flow
3. Agenda builder with drag-and-drop
4. Basic meeting CRUD
5. AI minutes generation
6. PDF export of minutes

### Phase 2: Financial Intelligence
1. Financial dashboard with Recharts
2. Manual data entry
3. Fortnox integration
4. AI financial analysis

### Phase 3: Compliance & Signatures
1. BankID integration
2. Jäv detection system
3. Adjuster workflow
4. Audit trail

### Phase 4: Advanced Features
1. Multi-tenant client manager
2. Document center with search
3. Mobile optimization
4. Offline support (PWA)

---

## Key Differentiators vs Competitors

| Feature | GovernanceOS | Boardeaser | OnBoard | Diligent |
|---------|--------------|------------|---------|----------|
| AI Minutes | Claude | No | Limited | No |
| Financial Consolidation | Yes | Yes | No | No |
| BankID Signing | Yes | Yes | No | No |
| Jäv Detection | AI-powered | Manual | No | No |
| Modern UI | Shadcn | Dated | Yes | Complex |
| Mobile App | PWA | iOS only | Native | Native |
| Open API | Planned | Limited | Yes | Enterprise |

---

## Support & Resources

- **Shadcn/UI Docs**: https://ui.shadcn.com
- **Next.js 14 Docs**: https://nextjs.org/docs
- **Firebase Docs**: https://firebase.google.com/docs
- **Anthropic API**: https://docs.anthropic.com
- **BankID Docs**: https://www.bankid.com/utvecklare/guider

---

## Notes for Claude Code

When working on this project:

1. **Always use TypeScript** with proper types - no `any`
2. **Follow the existing patterns** in the codebase
3. **Prefer Server Components** unless client interactivity is needed
4. **Use Shadcn/UI** components as the base for all UI
5. **Keep Swedish compliance in mind** - Aktiebolagslagen, GDPR, eIDAS
6. **Write tests** for critical business logic
7. **Document complex functions** with JSDoc comments
8. **Consider multi-tenancy** in all data operations
9. **Secure API routes** with proper authentication checks
10. **Optimize for Nordic users** - Swedish/English localization

---

*Last updated: February 2026*
