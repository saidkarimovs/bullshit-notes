# MERGE-NOTES (Prompt 2)

## Back-relations to add on existing models

**None.**

Every Prompt 2 model references existing entities (`User`, `Project`, `Report`)
through a plain scalar id column plus an `@@index`, never a Prisma relation.
This is deliberate, per the Prompt 2 guidance ("prefer designs that avoid
touching existing models: use a nullable scalar id with `@@index` instead of a
Prisma relation where reasonable"). As a result:

- `apps/api/prisma/schema.prisma` needs **no** edits to any existing model.
- No `User { ... }`, `Project { ... }`, or `Report { ... }` back-relation
  fields are required.

Scalar linkage used (for reference only — nothing to change):

| Prompt 2 model      | scalar column(s)                | points at            |
|---------------------|---------------------------------|----------------------|
| `AiSettings`        | `userId @unique`                | `User.id`            |
| `CveWatch`          | `userId`                        | `User.id`            |
| `CveBookmark`       | `userId`, `cveId`               | `User.id`, `Cve.cveId` |
| `HuntSession`       | `userId`, `projectId?`          | `User.id`, `Project.id` |
| `VdpContact`        | `projectId`                     | `Project.id`         |
| `VdpEvent`          | `reportId`                      | `Report.id`          |
| `Payload`           | `ownerId`                       | `User.id`            |
| `ChecklistTemplate` | `ownerId?`                      | `User.id`            |
| `Checklist`         | `projectId`, `templateId?`      | `Project.id`, `ChecklistTemplate.id` |
| `VaultEntry`        | `ownerId`, `projectId`          | `User.id`, `Project.id` |
| `Webhook`           | `ownerId`                       | `User.id`            |

Referential integrity for these columns is enforced in the service layer
(ownership checks, `NotFound`/`Forbidden` on missing parents), not by the DB.

## Manual SQL migration (required for the `search` module)

Run once after `prisma migrate deploy`:

```
psql "$DATABASE_URL" -f apps/api/prisma/migrations/manual/001_search.sql
```

It adds the generated `search_vector` tsvector columns + GIN indexes on
`Report`/`Note` and the `pg_trgm` indexes used by full-text and fuzzy search.
