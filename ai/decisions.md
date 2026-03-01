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

## ADR-PR-02 Minutes review and agenda-scoped comments
- **Date:** 2026-03-01
- **Context:** Meeting minutes required a lightweight collaborative review workflow with explicit reviewer states and actionable feedback at the agenda item level.
- **Decision:** Added `minutesReviews` and `minutesComments` as subcollections under each meeting (`tenants/{tenantId}/meetings/{meetingId}`), with one active review at a time and historical review retention.
- **Rationale:**
  - Keeping review/comments nested under meeting preserves tenant + meeting scoping and simplifies auth checks.
  - Agenda item scoped comments (`agendaItemId`) give direct traceability from each minute item to its feedback and support count badges in the UI.
  - Flat comments are intentionally chosen for v1 to keep read/write paths and indexes simple while still enabling resolve status and change-request signaling.
- **Consequences:**
  - Reviewer state transitions (`pending` → `approved` / `changes_requested`) can automatically drive overall review status.
  - Future threaded comments can be added by introducing `parentCommentId` without migrating existing comment semantics.
