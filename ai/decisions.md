# Architecture/product decisions log

## D-001: Swedish-first positioning
- **Decision**: Optimize language, templates, and workflows for Swedish boards first.
- **Why**: Strong local fit beats generic global governance UX in early stages.

## D-002: Focus on owner-led + PE-backed companies
- **Decision**: Prioritize this segment before broad enterprise expansion.
- **Why**: Clear pain around governance rigor, reporting cadence, and accountability.

## D-003: Module sequence
- **Decision**: Core modules are cap table, aktiebok, meeting lifecycle, decisions, follow-ups.
- **Why**: This sequence creates immediate operational value while building a durable governance data foundation.

## D-004: Managed cloud baseline
- **Decision**: Use Vercel for app runtime and Firebase for auth/data/storage.
- **Why**: Fast iteration, low ops overhead, and enough scale for current product stage.

## D-005: GitHub as delivery backbone
- **Decision**: Keep planning, code review, and release controls centered on GitHub.
- **Why**: Auditable engineering workflow and strong team familiarity.

## D-006: AI as copilot, not autopilot
- **Decision**: Use AI to summarize, draft, and highlight issues, with explicit human approval for final records.
- **Why**: Governance workflows require accountability, explainability, and legal caution.

- 2026-03-01: Adopted WebAuthn as a step-up factor (not passwordless) for tenant policy enforcement. This preserves existing Firebase first-factor flows while enabling passkey/YubiKey enforcement per tenant and role.

## ADR: Action Layer applied to core modules (Aktiebok, Documents, Meetings)
- Standardized endpoints:
  - `POST /api/shareholders`, `PATCH /api/shareholders/[id]`, `DELETE /api/shareholders/[id]`
  - `POST /api/documents/folders`, `PATCH /api/documents/[documentId]`, `DELETE /api/documents/[documentId]`
  - `POST /api/meetings`, `PATCH /api/meetings/[meetingId]/agenda/[agendaItemId]`, `PATCH /api/meetings/[meetingId]/minutes`
- Firestore paths:
  - `tenants/{tenantId}/shareholders/{shareholderId}`
  - `tenants/{tenantId}/documents/{documentId}` and folder entries in documents collection
  - `tenants/{tenantId}/meetings/{meetingId}`
  - `tenants/{tenantId}/action_audit_events/*` for action runs + audit events
- Idempotency policy:
  - Every write endpoint in these modules requires `x-idempotency-key`
  - `withIdempotency` stores action response and replays it for duplicate submissions, preventing duplicate writes from double-clicks and retries.
