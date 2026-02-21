# Architecture snapshot

## Platform choices
- **Frontend + hosting**: Vercel (Next.js app + API routes)
- **Data + auth + files**: Firebase Authentication, Firestore, Storage
- **Source control + workflow**: GitHub (issues, PRs, CI)

## Logical architecture
- **Web app (Next.js on Vercel)**: UI for board, company, and investor workflows.
- **API layer (server routes/functions)**: Enforces tenant/role checks and writes audit events.
- **Firestore domain model**:
  - tenants/organizations
  - members/roles
  - meetings, agendas, minutes
  - decisions, followUps
  - capTable, aktiebok entries, transactions
  - documents and file metadata
- **Storage layer**: Board packs, signed minutes, exported registers.
- **AuthN/AuthZ**: Firebase Auth identities + tenant-scoped RBAC claims.

## Integration boundaries
- External integrations are optional adapters (e.g., e-sign, accounting, calendar).
- Core governance records remain canonical in Firestore.

## Non-functional priorities
- Tenant isolation and least-privilege access.
- Full auditability on critical entities (ownership, meetings, decisions).
- Predictable low-ops deployment path via Vercel + Firebase managed services.
