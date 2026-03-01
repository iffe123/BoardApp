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

## D-007: Token-hashed calendar subscriptions for ICS/webcal feeds
- **Decision**: Implement calendar subscriptions as tokenized URLs where only SHA-256 token hashes are stored in Firestore (`calendar_subscriptions`), with explicit rotate/revoke endpoints.
- **Why**: Enables unauthenticated calendar feed consumption (`webcal://`) while reducing server-side token exposure and providing quick invalidation through token rotation.
