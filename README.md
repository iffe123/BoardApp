# GovernanceOS

**AI-Native Board Governance Platform for Modern Organizations**

GovernanceOS is a comprehensive board management platform built for the Nordic market, featuring AI-powered meeting minutes generation, financial intelligence dashboards, and Swedish corporate governance compliance including Jäv (conflict of interest) detection and BankID digital signatures.

## Features

### Meeting Management
- **Smart Agenda Builder**: Drag-and-drop agenda creation with polymorphic item types (Information, Decision, Discussion, Formality)
- **AI Minutes Generation**: Automatic meeting minutes generation powered by Claude AI
- **Digital Signatures**: BankID integration for legally binding document signing
- **Adjuster Workflow**: Swedish-compliant minute verification process (Justeringsman)

### Financial Intelligence
- **Real-time Dashboards**: Rolling 12-month financial analytics with interactive charts
- **ERP Integration**: Connect to Fortnox, Visma, and other Nordic ERP systems
- **AI Analysis**: Automated financial insights and variance explanations
- **KPI Tracking**: Comprehensive key performance indicators

### Nordic Compliance
- **Jäv Detection**: Automatic conflict of interest identification and recusal management
- **BankID Signing**: Swedish BankID integration for Advanced Electronic Signatures (eIDAS compliant)
- **GDPR Compliant**: European data residency with Firebase europe-west1/europe-north1
- **Swedish Companies Act**: Built-in compliance with Aktiebolagslagen

### Multi-Tenant Architecture
- **Client Manager**: For accounting firms managing multiple organizations
- **Role-Based Access**: Granular permissions (Owner, Admin, Secretary, Chair, Director, Observer, Auditor)
- **Custom Claims**: Firebase Authentication with multi-tenant JWT claims

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **UI Components**: Shadcn/UI, Radix UI, Lucide Icons
- **Backend**: Firebase (Firestore, Authentication, Storage, Cloud Functions)
- **Hosting**: Vercel (Edge Functions, Serverless)
- **AI**: Anthropic Claude 3.5 Sonnet via Vercel AI SDK
- **State Management**: Zustand (client), React Query (server)
- **Charts**: Recharts
- **Drag & Drop**: @dnd-kit

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Firebase project
- Anthropic API key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/governanceos.git
   cd governanceos
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```

4. Fill in your environment variables in `.env.local`

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

### Firebase Setup

1. Create a new Firebase project at [console.firebase.google.com](https://console.firebase.google.com)

2. Enable the following services:
   - Authentication (Email/Password, Google)
   - Firestore Database
   - Cloud Storage

3. Deploy Firestore security rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

4. Set up Cloud Functions for custom claims (see `/functions` directory)

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   └── ai/           # AI endpoints (minutes, financial analysis)
│   ├── (auth)/           # Authentication pages
│   └── (dashboard)/      # Dashboard pages
├── components/            # React components
│   ├── ui/               # Base UI components (Shadcn-style)
│   ├── meetings/         # Meeting-related components
│   ├── financial/        # Financial dashboard components
│   ├── documents/        # Document management
│   ├── compliance/       # Nordic compliance (Jäv, signatures)
│   ├── client-manager/   # Multi-org management
│   └── layout/           # Layout components
├── contexts/              # React contexts
├── hooks/                 # Custom React hooks
├── lib/                   # Utility libraries
│   ├── firebase.ts       # Firebase configuration
│   ├── utils.ts          # Utility functions
│   └── signature-service.ts  # Digital signature service
└── types/                 # TypeScript types
    └── schema.ts         # Firestore data models
```

## Key Components

### Agenda Builder
```tsx
import { AgendaBuilder } from '@/components/meetings/agenda-builder';

<AgendaBuilder
  items={agendaItems}
  onChange={setAgendaItems}
  startTime={meetingStart}
  members={boardMembers}
/>
```

### Financial Dashboard
```tsx
import { FinancialDashboard } from '@/components/financial/financial-dashboard';

<FinancialDashboard
  periods={financialPeriods}
  currentPeriod={currentPeriod}
  aiAnalysis={aiInsights}
  onRefreshAI={generateNewAnalysis}
/>
```

### Conflict Detector
```tsx
import { ConflictDetector } from '@/components/compliance/conflict-detector';

<ConflictDetector
  agendaItem={currentItem}
  members={boardMembers}
  currentUserId={userId}
  onRecuse={handleRecusal}
/>
```

## API Routes

### Financial Analysis
```
POST /api/ai/analyze-financials
```
Generates AI-powered financial insights from period data.

### Minutes Generation
```
POST /api/ai/generate-minutes
```
Generates meeting minutes from agenda items and notes.

## Security

- Firestore Security Rules enforce multi-tenant data isolation
- Custom Claims in Firebase Authentication for role-based access
- Server-side API key protection for AI services
- Document hashing for signature integrity verification

## License

MIT License

---

Built with care for the Nordic market.
