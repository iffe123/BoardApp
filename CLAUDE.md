# CLAUDE.md — GovernanceOS Development Guide

AI-native board governance for the Nordic market. Domain: boardapp.ai | Repo: github.com/iffe123/BoardApp | Live: board-app-alpha.vercel.app

## 1. IDENTITY & MARKET POSITION

GovernanceOS is a Swedish-first, AI-native board portal targeting owner-led companies, PE-backed portfolio companies, and accounting firms managing multiple boards. We compete in a Nordic board governance segment worth $70–110M within a global market of $2.8B growing 10–12% CAGR.

### Why we win

The Nordic market has bifurcated into two stacks — Fortnox/Boardeaser (SME, associations) and Visma/Admincontrol (mid-to-large, listed) — leaving a clear gap for:

1. **AI-native governance** — Only 2% of boards rate themselves AI-knowledgeable, yet AI-savvy boards outperform peers by 10.9pp ROE. 69% of directors already use consumer AI tools for board work but lack a secure, governance-specific platform. We close that gap.
2. **PE portfolio governance** — Firms managing 10–75+ companies need cross-portfolio dashboards, always-ready data rooms, and standardized governance. No current solution addresses this end-to-end. Sweden's PE ecosystem (SEK 123B raised in 2024) is substantial.
3. **Modern UX with deep compliance** — Boardeaser has a dated interface with no AI. Admincontrol is functional but not modern. Diligent is enterprise-expensive with no Nordic compliance. We deliver Shadcn-quality UI with aktiebok + BankID + Jäv + SIE-4 baked in.

### Target personas (priority order)

1. Board secretary / legal ops at PE-backed companies — power user, daily
2. Chair / board lead — meeting preparation, decision oversight
3. PE operating partner — portfolio-wide governance view across 6–12 boards
4. CEO / founder — action tracking, financial reporting
5. Accounting firm advisor — multi-client governance management

### Competitive intel to keep in mind

| Competitor | Strength | Weakness we exploit |
|-----------|----------|-------------------|
| Boardeaser (Fortnox, SEK 599/mo) | Fortnox distribution (612K companies), aktiebok, BankID | No AI, aktiebok capped at 100 shareholders, dated UX |
| Admincontrol (Visma, ~€500/mo) | Nordic market leader, 850+ customers, VDR | Functional-not-modern UI, fewer integrations |
| Diligent ($5K–100K+/yr) | 62% Fortune 500, GovernAI suite, analyst leader | No BankID/aktiebok/SIE-4, aggressive pricing, antiquated UX |
| OnBoard ($7K–15K/yr) | AI suite (6 modules), 40–50% cheaper than Diligent | No Nordic compliance whatsoever |
| Hippoly (€75–190/mo) | Modern, AI-enhanced, unlimited users per workspace | Small, limited feature depth |
| BoardClic | Board evaluation specialist, PE portfolio analytics | Not a portal — complementary, potential partner |

---

## 2. TECH STACK

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Framework** | Next.js 14 (App Router) | Upgrade to 15 is on roadmap |
| **Language** | TypeScript (strict mode) | Zero `any` tolerance |
| **Styling** | Tailwind CSS + Shadcn/UI + Radix UI | `cn()` utility for conditionals |
| **Icons** | Lucide React | |
| **Backend** | Firebase (Firestore, Auth, Storage) | Multi-tenant via `/tenants/{tenantId}/` |
| **Hosting** | Vercel (Edge + Serverless) | Auto-deploy from `main` |
| **AI** | Anthropic Claude via Vercel AI SDK (`@ai-sdk/anthropic`) | Sonnet for speed, Opus for complex analysis |
| **State** | Zustand (client), TanStack Query (server) | Stores in `src/stores/` |
| **Charts** | Recharts | |
| **Drag & Drop** | @dnd-kit | |
| **Validation** | Zod | All API inputs validated |
| **Testing** | Jest + RTL (unit), Playwright (E2E) | |
| **Email** | Resend (planned) | Branded HTML templates |

---

## 3. PROJECT STRUCTURE

```
src/
├── app/
│   ├── api/                          # Server-side API routes
│   │   ├── ai/                       # AI endpoints (minutes, financials, assistant)
│   │   ├── auth/webauthn/            # WebAuthn step-up authentication
│   │   ├── bankid/                   # BankID sign + collect
│   │   ├── calendar/                 # iCal subscriptions
│   │   ├── cron/                     # Scheduled jobs (reminders, sync, cleanup)
│   │   ├── decisions/                # Decision register + voting
│   │   ├── documents/                # Document CRUD, folders, upload, read-confirm
│   │   ├── execution/                # Action item execution tracking
│   │   ├── exports/exit-mode/        # PE exit-readiness data export
│   │   ├── integrations/             # Fortnox, Visma, Google/Microsoft calendar, SIE-4
│   │   ├── meetings/                 # Full meeting lifecycle + minutes review
│   │   ├── members/                  # Board member management
│   │   ├── notifications/            # In-app notification feed
│   │   ├── settings/                 # Tenant settings
│   │   ├── shareholders/             # Aktiebok shareholder CRUD
│   │   ├── shares/                   # Share transactions, cap table, export
│   │   ├── templates/                # Meeting agenda templates
│   │   └── webhooks/                 # BankID, Fortnox, Visma, Stripe callbacks
│   ├── auth/                         # Login, signup, reset, WebAuthn step-up
│   ├── dashboard/[tenantId]/         # All tenant-scoped pages
│   │   ├── annual-planner/           # Board annual wheel
│   │   ├── decisions/                # Decision register
│   │   ├── documents/                # Document center
│   │   ├── execution/                # Action item dashboard
│   │   ├── exit-mode/                # PE exit readiness
│   │   ├── financials/               # Financial intelligence
│   │   ├── meetings/                 # Meeting list, detail, new, templates
│   │   ├── members/                  # Member directory
│   │   ├── settings/                 # Tenant configuration
│   │   └── share-registry/           # Aktiebok + cap table
│   └── onboarding/                   # New tenant setup flow
├── components/
│   ├── ui/                           # Shadcn/UI primitives
│   ├── action/                       # Action framework UI
│   ├── ai/                           # AI capabilities card
│   ├── annual-planner/               # Annual wheel + event management
│   ├── client-manager/               # Multi-org overview
│   ├── compliance/                   # BankID signer, conflict detector
│   ├── documents/                    # Document list, annotations
│   ├── financial/                    # Dashboard, KPIs, charts
│   ├── layout/                       # Sidebar navigation
│   ├── meetings/                     # Agenda builder, minutes, calendar, templates
│   ├── notifications/                # Bell + dropdown
│   └── shares/                       # Cap table, shareholder list, transactions, export
├── contexts/                         # Auth + theme contexts
├── hooks/                            # Custom hooks (AI, Firestore, actions, audit)
├── lib/
│   ├── actions/                      # Action framework (client/server, idempotency)
│   ├── auth/                         # Session verification
│   ├── dal/                          # Data Access Layer (documents, meetings, members, shareholders, shares)
│   ├── errors/                       # AppError classes
│   ├── firebase/                     # Firestore converters
│   ├── ai-service.ts                 # Claude AI wrapper
│   ├── audit-service.ts              # Audit trail logging
│   ├── calendar-service.ts           # iCal generation
│   ├── calendar-subscription-service.ts
│   ├── decision-voting.ts            # Voting logic
│   ├── email-service.ts              # Email notifications
│   ├── execution.ts                  # Action item tracking
│   ├── exit-mode.ts                  # PE exit readiness
│   ├── firebase.ts                   # Firebase config
│   ├── fortnox-service.ts            # Fortnox API client
│   ├── meeting-templates.ts          # Template engine
│   ├── minutes-review-service.ts     # Review workflow
│   ├── notification-service.ts       # In-app notifications
│   ├── pdf-export.ts                 # PDF generation
│   ├── rate-limit.ts                 # API rate limiting
│   ├── read-confirmation-service.ts  # Document read tracking
│   ├── sie-parser.ts                 # SIE-4 file parser
│   ├── signature-service.ts          # BankID integration
│   ├── visma-service.ts              # Visma API client
│   └── webauthn.ts                   # WebAuthn helpers
├── stores/                           # Zustand stores
│   ├── meeting-store.ts
│   ├── organization-store.ts
│   └── ui-store.ts
└── types/
    ├── schema.ts                     # Complete Firestore data models
    └── annual-planner.ts
```

---

## 4. SWEDISH LAW — HARD CONSTRAINTS

These are not optional features. They are legal requirements that every code change must respect.

### 4.1 Aktiebok (Share Register) — ABL Chapter 5

Every aktiebolag must maintain a digital share register. The board is personally liable (ABL 5:7). Non-compliance can mean fines or imprisonment (ABL Chapter 30).

**Required data per share**: serial number, shareholder identity (name, personnummer, address), share class, transfer restrictions, dated entries. **Retention**: company lifetime + 10 years after dissolution. The register must be publicly accessible on request.

**Our implementation must**: support unlimited shareholders (Boardeaser caps at 100 — this is our advantage), track full transaction history with immutable audit trail, handle all share classes (A/B/C/preference/common), support `founding`, `new_issue`, `transfer`, `split`, `redemption`, `bonus_issue` transaction types, and export for authority filings.

### 4.2 BankID Digital Signatures — ABL 1:13 + eIDAS

Swedish BankID qualifies as Advanced Electronic Signature (AES) under eIDAS. ABL 1:13 permits AES for virtually all company documents. Board minutes require signatures from recorder + at least one verifier (ABL 8:24). Per capsulam decisions require all board member signatures.

**Exceptions requiring wet-ink**: share certificates (ABL 6:3), emission certificates (ABL 11:6).

**Our implementation must**: integrate with BankID RP API v6.0, support batch signing, handle the BankID polling flow (sign → collect → complete), store signature proofs with audit trail. **Limitation**: non-residents without personnummer cannot get BankID — provide fallback signing method.

### 4.3 Jäv (Conflict of Interest) — ABL 8:23

Board members must not participate in matters where they have material conflicts. A conflicted member is not counted for quorum (ABL 8:21). Tainted decisions are void or voidable, fixable only by unanimous shareholder consent.

**Three conflict categories**: self-dealing, interest conflicts, representative conflicts (e.g., sitting on counterparty's board).

**Our implementation must**: maintain interest declaration registries per member, auto-detect conflicts by cross-referencing agenda items against member relationships/company connections, enforce exclusion workflows with quorum recalculation, and maintain complete audit trails. This is the feature where AI adds the most legal value.

### 4.4 GDPR + Swedish Data Protection

Processing personnummer has specific Swedish rules. Legal basis should be legitimate interest or legal obligation — never consent (power imbalances make consent invalid). Cross-border data transfers to US require SCCs post-Schrems II. Our EU-hosted architecture is a structural competitive advantage over Diligent and US-based providers.

### 4.5 Swedish Corporate Governance Code (Jan 2024)

Applies comply-or-explain to regulated market companies. Code 9.1 mandates annual systematic board evaluations reported to the nomination committee. Also requires: independence tracking (majority independent of management, ≥2 independent of major shareholders), compensation committee, annual auditor meetings without management, continuous CEO evaluation. Listed companies must keep 10 years of governance reports on their websites.

---

## 5. DATA MODEL

Firestore path convention: `/tenants/{tenantId}/[collection]/{docId}`

Complete schema in `src/types/schema.ts`. Key models:

- **Tenant** — org identity, subscription, settings, security policy (WebAuthn)
- **Member** — user↔tenant binding with role, title, committees, relationships (for Jäv)
- **Meeting** — full lifecycle (draft→scheduled→active→completed→cancelled), agenda items, attendees
- **Minutes** — linked to meeting, content, signatures array, review status
- **Decision** — formal decision log with voting (for/against/abstain), linked to meetings
- **FollowUp** — action items with owner, due date, status, linked to decisions
- **Shareholder** — aktiebok entry (name, personnummer, address, share count by class)
- **ShareTransaction** — immutable transfer/issue/redemption records
- **Document** — metadata, version history, folder structure, read confirmations
- **FinancialPeriod** — monthly/quarterly P&L, balance sheet, cash flow, KPIs
- **ActionAuditEvent** — every mutation logged for compliance

### Multi-tenancy rules

- Every Firestore query must be scoped to `tenantId`
- Server-side role checks via `lib/auth/verify-session.ts` — never trust client claims
- All write endpoints require `x-idempotency-key` header (action framework in `lib/actions/`)
- DAL layer in `src/lib/dal/` abstracts Firestore operations with type safety

---

## 6. SECURITY & AUTH

### Authentication flow

1. Firebase Auth (email/password, Google, Microsoft)
2. Custom claims carry tenant memberships + roles
3. WebAuthn step-up for sensitive operations (configurable per tenant/role)

### Role hierarchy

```
owner > admin > secretary = chair > director > observer = auditor
```

**Roles**: owner (full + billing), admin (full), secretary (meetings, documents), chair (meeting control, decisions), director (standard member), observer (read-only), auditor (read-only + compliance reports).

### Security priorities

- Rate limiting on all API routes (`lib/rate-limit.ts`)
- Input validation with Zod on every endpoint
- Audit trail on every state mutation (`lib/audit-service.ts`)
- Firestore security rules enforce tenant isolation server-side
- No sensitive data in client bundles — personnummer, BankID certs are server-only

---

## 7. AI CAPABILITIES — OUR CORE DIFFERENTIATOR

AI is the defining battleground for 2025–2026. We use Claude (via Vercel AI SDK) as a governance copilot — assisting, never replacing human judgment.

### Currently implemented

- `POST /api/ai/generate-minutes` — AI drafts minutes from agenda + notes
- `POST /api/ai/analyze-financials` — Variance explanations, trend analysis
- `POST /api/ai/summarize-document` — Board pack summarization
- `POST /api/ai/comprehensive-analysis` — Deep multi-dimensional analysis
- `POST /api/ai/meeting-assistant` — Real-time meeting guidance
- Components: `ai-capabilities-card.tsx`, `ai-assistant.tsx`

### What to build next (competitive parity + differentiation)

**Phase A — Match OnBoard's AI suite** (they claim 90% time savings):
- **Agenda AI** — Auto-generate agenda from previous meetings + pending items + annual plan
- **Book AI** — Compile and organize board packs with AI-suggested reading order
- **Minutes AI** — Already started, enhance with formal Swedish protocol format (§-numrering)
- **Actions AI** — Extract action items from minutes, assign owners, set deadlines
- **Insights AI** — Surface patterns across meetings (recurring unresolved items, attendance trends)

**Phase B — Go beyond competitors** (nobody does this yet):
- **Jäv AI** — Automated conflict detection by analyzing agenda items against member relationship graphs. Cross-reference company registry data (Bolagsverket) with board composition. This is a legal moat — incredibly valuable and hard to replicate.
- **Governance Score** — AI-powered board health rating: meeting cadence, decision follow-through rate, document engagement, evaluation completion. Benchmarked against Swedish Corporate Governance Code requirements.
- **Financial Narrative AI** — Auto-generate the "VD har ordet" section of board reports: plain-language financial commentary with variance explanations, trend context, and risk flags. Swedish CFOs spend 3–5 hours per board meeting preparing this manually.
- **Predictive Compliance** — Monitor regulatory changes (EU AI Act enforcement Aug 2026, CSRD, updated Swedish code), auto-flag which governance processes need updating.
- **PE Portfolio Intelligence** — Cross-portfolio pattern recognition: which companies are underperforming on governance metrics, where are decision bottlenecks, aggregate financial trends.

### AI implementation rules

- All AI outputs are clearly marked as AI-generated drafts
- Human approval required before any AI output becomes an official record
- AI never invents legal facts or compliance status
- Full provenance: every generated artifact links to its source inputs
- Rate limit AI calls per tenant per billing tier

---

## 8. INTEGRATION LANDSCAPE

### Critical (must-have for Swedish market)

**Fortnox API** (REST v3, OAuth 2.0) — `lib/fortnox-service.ts`
- Sweden's dominant accounting platform (612K+ companies, ~60% market share)
- Access: accounts, invoices, financial years, vouchers, company info
- Our integration routes: connect/callback/sync/disconnect + webhook

**SIE-4 File Import** — `lib/sie-parser.ts` + `api/integrations/sie4/`
- Universal fallback for any Swedish accounting system
- Standard accounting data exchange format
- Must handle: verification records, account balances, period data

**BankID** — `lib/signature-service.ts` + `api/bankid/`
- Sign, collect, cancel flows
- Test environment: `appapi2.test.bankid.com/rp/v6.0`
- Production requires PFX certificate + CA cert

### High priority

**Visma eEkonomi** — `lib/visma-service.ts`
- REST APIs with OData filtering, #2 accounting ecosystem
- Routes: connect/callback/sync/disconnect + webhook

**Calendar sync** — Google + Microsoft
- `lib/google-calendar-service.ts`, `lib/microsoft-calendar-service.ts`
- OAuth connect flows + bidirectional sync
- iCal subscription endpoint for read-only feeds

### Medium priority (future)

- PE Accounting / Kleer — REST API + SQL Analytics
- Björn Lundén — Via SIE-4
- Stripe — Billing (webhook handler exists)
- Bolagsverket API — Swedish Companies Registration Office data for Jäv detection
- Resend — Email notifications with branded templates

---

## 9. PE PORTFOLIO FEATURES — HIGH-VALUE SEGMENT

This is an underserved, high-willingness-to-pay segment. Individual PE partners sit on 6–12 boards and need unified views.

### Already built

- **Exit Mode** — PE exit readiness assessment + data export (`api/exports/exit-mode/`, `app/dashboard/[tenantId]/exit-mode/`)
- **Execution Dashboard** — Cross-company action item tracking

### Must build

- **Portfolio Dashboard** — Aggregate view across all tenant boards a user sits on: upcoming meetings, overdue actions, financial KPI heatmap, governance health scores
- **Standardized Reporting** — Consistent board pack template across portfolio with PE-relevant KPIs (EBITDA margin, revenue growth, NRR, cash runway)
- **Transaction Readiness Score** — Continuous assessment of each portfolio company's diligence readiness: governance documentation completeness, aktiebok accuracy, compliance status
- **Board Evaluation** — Structured annual evaluations per Code 9.1, aggregated across portfolio (à la BoardClic's PE tier, but integrated into the portal)
- **Virtual Data Room (VDR)** — Secure document sharing for M&A processes, IPO preparation — Admincontrol charges separately for this

---

## 10. MONETIZATION STRATEGY

### Pricing tiers (based on competitive analysis)

| Tier | Monthly (SEK) | Target | Key features |
|------|--------------|--------|-------------|
| Starter | 499 | Small boards, associations | 1 org, 5 members, basic meetings, aktiebok (≤50 shareholders) |
| Professional | 1,299 | Owner-led AB, growing companies | 1 org, 15 members, full meetings + minutes AI, aktiebok unlimited, BankID signing, financial dashboard, SIE-4 import |
| Business | 2,999 | PE-backed, mid-market | 1 org, unlimited members, all AI features, Fortnox/Visma integration, calendar sync, document center, Jäv AI, board evaluations |
| Portfolio | 9,999 | PE firms, accounting firms | Unlimited orgs, portfolio dashboard, cross-company analytics, exit mode, VDR, priority support, API access |

### Revenue expansion path (proven by Diligent's $200M→$582M+ ARR growth)

Board portal → aktiebok/cap table → compliance/Jäv → financial intelligence → AI premium → VDR → portfolio analytics

### Key pricing insight from research

- Boardeaser charges SEK 599/mo base + add-ons (e-sign SEK 199, mobile SEK 199)
- Admincontrol starts ~€500/mo (~SEK 5,500)
- Our Professional tier at SEK 1,299 positions between Boardeaser (full) and Admincontrol, with more AI and modern UX than either

---

## 11. DEVELOPMENT PRIORITIES

### NOW — Ship immediately (blocking revenue)

1. **Aktiebok completion** — Unlimited shareholders, full transaction history, PDF/CSV export for Bolagsverket filings. This is legally required and Boardeaser's 100-shareholder cap is our opening.
2. **Minutes AI → production quality** — Support formal Swedish protocol format (§1 Mötets öppnande, §2 Val av justeringsman, etc.). Include adjuster workflow with BankID signing.
3. **Onboarding flow polish** — First 5 minutes must feel magical. Auto-detect org type, import from Bolagsverket via org number, suggest board composition.
4. **Mobile responsive** — 60%+ of directors review board packs on tablets/phones. PWA with offline board pack reading.

### NEXT — Competitive parity features

1. **Email notifications** — Meeting invitations, document sharing, action reminders, minutes ready for review. Branded HTML via Resend.
2. **Fortnox integration production-ready** — OAuth flow, automatic financial sync, error handling, reconnection.
3. **Jäv AI detection** — The feature that makes us genuinely different. Automated conflict scanning on every agenda item.
4. **Document center v2** — Version history, folder organization, read confirmations with reminders, board pack assembly.

### LATER — Premium differentiation

1. PE Portfolio Dashboard — Multi-tenant aggregate views
2. Financial Narrative AI — Auto-generated "VD har ordet"
3. Board Evaluation Module — Annual evaluation per Code 9.1
4. Governance Score — AI-powered board health rating
5. VDR for M&A — Secure data room with granular access
6. Predictive Compliance — EU AI Act, CSRD monitoring
7. Next.js 15 upgrade — Improved performance, React 19 features

---

## 12. CODING STANDARDS

### TypeScript
- `strict: true` — zero tolerance for `any`
- Prefer `interface` for objects, `type` for unions/intersections
- Discriminated unions for polymorphic types (see `AgendaItemType`)
- Zod schemas for all API input validation

### React / Next.js
- Server Components by default, `'use client'` only when needed
- Props interfaces above component, destructured in signature
- Dynamic imports for heavy components (Recharts, editors)
- Absolute imports via `@/` alias

### Naming
- Components: `PascalCase.tsx` (e.g., `AgendaBuilder.tsx`)
- Hooks/utils: `kebab-case.ts` (e.g., `use-meetings.ts`)
- API routes: Next.js convention `route.ts`

### Styling
- Tailwind only — no CSS modules, no inline styles
- `cn()` for conditional classes
- Shadcn/UI as foundation for all UI components

### API patterns
- All mutations go through the action framework (`lib/actions/`)
- Idempotency keys on every write (`x-idempotency-key` header)
- Rate limiting via `lib/rate-limit.ts`
- Zod validation → auth check → business logic → Firestore write → audit log
- Return consistent error shapes via `lib/errors/AppError.ts`

### Testing
- Unit tests for business logic (DAL, services, utilities)
- Component tests with React Testing Library
- E2E with Playwright for critical flows (auth, meeting lifecycle, aktiebok)
- Test files in `src/__tests__/` mirroring source structure

---

## 13. COMMANDS

```bash
npm run dev              # Development server (localhost:3000)
npm run build            # Production build
npm run lint             # ESLint check
npm run type-check       # TypeScript compilation check
npm run test             # Jest unit/integration tests
npm run test:watch       # Jest watch mode
npm run test:coverage    # Coverage report
npx playwright test      # E2E tests

# Firebase
firebase emulators:start                    # Local Firestore/Auth
firebase deploy --only firestore:rules      # Deploy security rules
firebase deploy --only functions            # Deploy Cloud Functions
```

---

## 14. ENVIRONMENT VARIABLES

```bash
# Firebase (client-side)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (server-side only)
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=

# AI
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

# Email
RESEND_API_KEY=

# Billing
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 15. KEY PRINCIPLES FOR CLAUDE CODE

When working on this codebase, always:

1. **Think Swedish-first** — terminology (aktiebok, not "share register"), templates (§-format for protocols), locale defaults (sv-SE)
2. **Respect the law** — ABL, GDPR, eIDAS are hard constraints, not guidelines. When in doubt, be more restrictive
3. **Tenant isolation is non-negotiable** — every query scoped to `tenantId`, every mutation through the action framework with audit logging
4. **AI assists, humans decide** — all AI output is a draft until a human approves it. Mark AI-generated content clearly
5. **Build for the least technical director** — board members are often 60+ executives. UI must be obvious, fast, and work on iPad
6. **Idempotency everywhere** — board governance cannot have duplicate minutes or double-counted votes
7. **Audit everything** — compliance requires knowing who did what, when, and why. Use `lib/audit-service.ts`
8. **Test the critical paths** — aktiebok mutations, BankID signing, meeting lifecycle, financial imports. These cannot break
9. **Keep the DAL clean** — all Firestore operations through `src/lib/dal/`. No raw Firestore calls in components or API routes
10. **Design for PE scale** — a single user may interact with 12 tenants. Navigation, notifications, and dashboards must support this

---

*Last updated: March 2026*
*Market research basis: 60+ sources including Deloitte, McKinsey, MIT, Gartner, public filings, and direct competitor analysis*
