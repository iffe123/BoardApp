# Constraints and guardrails

## Business/domain constraints
- Swedish governance terminology must be first-class (e.g., **aktiebok**).
- Ownership and decision history must be immutable/auditable enough for diligence.
- Board artifacts often include sensitive data and require strict access control.

## Technical constraints
- Stack is fixed by default: **Vercel + Firebase + GitHub**.
- Firestore query/model limits influence document structure and indexing strategy.
- Multi-tenant RBAC must be enforced server-side, not only in UI.
- File handling must account for secure sharing, retention, and revocation.

## Delivery constraints
- Favor incremental module releases over big-bang platform rewrites.
- Keep workflows simple for non-technical executives.
- Maintain concise Swedish-first UX copy, with English as secondary.

## AI-specific constraints
- AI outputs are assistive drafts; final governance responsibility remains human.
- Do not invent legal facts or compliance status.
- Preserve provenance: generated content should be traceable to source inputs.
