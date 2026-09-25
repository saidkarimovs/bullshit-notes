# API CONTRACT (Prompt 1)

This is the single source of truth for the other three developers. It describes
the response envelope, every endpoint implemented in Prompt 1, and the exported
names from `@bn/shared`.

All routes are prefixed with `/api`. All routes require a Bearer access token
except those marked **public**. Roles: `OWNER > ADMIN > MEMBER > READONLY`.

---

## Response envelope (non-negotiable)

Success (single):
```json
{ "data": { "...": "payload" } }
```

Success (list endpoints only):
```json
{ "data": [ ... ], "meta": { "page": 1, "perPage": 25, "total": 0, "totalPages": 1 } }
```

Error:
```json
{ "error": { "code": "ErrorCode", "message": "string", "details": [ { "field": "x", "issue": "y" } ] } }
```

`ErrorCode` is one of:
`UNAUTHENTICATED | FORBIDDEN | NOT_FOUND | VALIDATION_ERROR | CONFLICT | RATE_LIMITED | UPSTREAM_ERROR | INTERNAL_ERROR`

Error mapping:
| Cause | code | HTTP |
|---|---|---|
| ZodError | VALIDATION_ERROR | 422 |
| Prisma P2002 | CONFLICT | 409 |
| Prisma P2025 | NOT_FOUND | 404 |
| UnauthorizedException | UNAUTHENTICATED | 401 |
| ForbiddenException | FORBIDDEN | 403 |
| Throttler (429) | RATE_LIMITED | 429 |
| anything else | INTERNAL_ERROR | 500 |

Controllers return either a bare payload (wrapped as `{ data }`) or
`{ items, meta }` (emitted as `{ data: items, meta }`) via the global
`TransformInterceptor`.

Implementation notes for Prompt 2:
- Return `{ items, meta }` from list handlers to get the paginated envelope.
- Throw standard Nest exceptions; the global `AllExceptionsFilter` maps them.
- Throw `ZodError` (e.g. via `new ZodValidationPipe(schema)`) for 422.

---

## Pagination (shared)

All list endpoints accept `paginationQuerySchema`:
`page` (>=1, default 1), `perPage` (1..100, default 25), `sort` (default
`createdAt`), `order` (`asc|desc`, default `desc`), `q` (optional search).

---

## Auth (`/api/auth`) — rate limited 5 req / 60s / IP

| Method | Path | Auth | Body | Response `data` |
|---|---|---|---|---|
| POST | `/auth/signup` | public | `{ name, email, password }` | `{ accessToken, expiresIn }` + sets `bn_rt` cookie |
| POST | `/auth/login` | public | `{ email, password }` | `{ accessToken, expiresIn }` OR `{ requires2fa: true, challengeToken }` |
| POST | `/auth/login/2fa` | public | `{ challengeToken, code }` | `{ accessToken, expiresIn }` |
| POST | `/auth/refresh` | cookie | — | `{ accessToken, expiresIn }` (rotates cookie) |
| POST | `/auth/logout` | public | — | `{ ok: true }` (clears cookie) |
| GET | `/auth/me` | yes | — | current user (no secrets) |
| POST | `/auth/2fa/setup` | yes | — | `{ secret, otpauthUrl, qrDataUrl }` |
| POST | `/auth/2fa/enable` | yes | `{ code }` | `{ recoveryCodes: string[10] }` (shown once) |
| POST | `/auth/2fa/disable` | yes | `{ password, code }` | `{ ok: true }` |
| GET | `/auth/sessions` | yes | — | active sessions (`current` flag) |
| DELETE | `/auth/sessions/:id` | yes | — | `{ ok: true }` |

Tokens:
- Access token: JWT HS256, 15 min, `Authorization: Bearer <token>`.
- Refresh token: opaque 48 random bytes, SHA-256 hashed in `Session`, delivered
  as httpOnly Secure SameSite=Lax cookie `bn_rt`, path `/api/auth`, 30 days.
- Refresh is **rotating**; presenting a revoked token revokes **all** of that
  user's sessions (reuse detection) and returns `UNAUTHENTICATED`.
- Password rule: min 12 chars, >=1 letter and >=1 digit.
- First user ever created is `OWNER`; all others `MEMBER`. If
  `ALLOW_SIGNUP=false` and a user already exists, signup returns `FORBIDDEN`.

Every other route bucket is rate limited to 300 req / 60s / IP.

---

## Users (`/api/users`)

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/users` | ADMIN+ | list, filter `role` |
| PATCH | `/users/me` | any | update own `name/timezone/avatarUrl` |
| GET | `/users/:id` | ADMIN+ | single |
| PATCH | `/users/:id` | ADMIN+ | update `name/role/timezone/avatarUrl` |
| DELETE | `/users/:id` | OWNER | delete |

## Projects (`/api/projects`)

| Method | Path | Notes |
|---|---|---|
| GET | `/projects` | list; filters `type`, `status`, `platform` |
| POST | `/projects` | create; `slug` auto-generated, numeric suffix on collision |
| GET | `/projects/:id` | single (with tags) |
| GET | `/projects/:id/overview` | `{ project, reportsBySeverity, assetsByStatus, recentActivity[<=10] }` |
| PATCH | `/projects/:id` | update |
| DELETE | `/projects/:id` | delete |

## Reports (`/api/reports`)

| Method | Path | Notes |
|---|---|---|
| GET | `/reports` | filters `type,status,severity,projectId,tags[],from,to` |
| POST | `/reports` | create; `slug` auto-generated |
| GET | `/reports/:id` | single (with tags, events, attachments) |
| PATCH | `/reports/:id` | update |
| DELETE | `/reports/:id` | delete |
| POST | `/reports/:id/status` | `{ toStatus, note?, duplicateOfId? }` |

Status state machine (illegal moves -> `CONFLICT` 409):
```
DRAFT     -> SUBMITTED
SUBMITTED -> TRIAGED | REJECTED | DUPLICATE
TRIAGED   -> ACCEPTED | REJECTED | DUPLICATE
ACCEPTED  -> PAID
PAID | REJECTED | DUPLICATE -> (terminal)
```
- Each successful transition writes a `ReportEvent` in the same transaction and
  stamps `submittedAt` / `resolvedAt` / `paidAt`.
- `-> DUPLICATE` requires `duplicateOfId`.
- When `cvssVector` is supplied on create/update, the server parses it,
  computes `cvssScore` (CVSS 3.1 base), and **derives** `severity` from the
  score; a client-sent `severity` is ignored while a vector is present.

## Notes & Folders (`/api/notes`, `/api/folders`)

| Method | Path | Notes |
|---|---|---|
| GET | `/notes` | filters `folderId,projectId,pinned,archived,tags[]` |
| POST | `/notes` | create; re-indexes `[[wikilinks]]` |
| GET | `/notes/graph` | `{ nodes:[{id,title,tags,linkCount}], edges:[{source,target,resolved}] }` |
| GET | `/notes/:id` | single |
| GET | `/notes/:id/backlinks` | resolved incoming links |
| PATCH | `/notes/:id` | update; re-indexes links |
| DELETE | `/notes/:id` | delete (incoming links become dangling) |
| GET | `/folders` | own folders |
| POST | `/folders` | create |
| PATCH | `/folders/:id` | update |
| DELETE | `/folders/:id` | delete |

Wikilink rules: parse `[[Target]]` / `[[Target|alias]]` with
`/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g`. On save, in one transaction: delete the
note's `NoteLink` rows, re-insert one per unique target, resolve each to a note
by case-insensitive title (else dangling, `resolved=false`, `targetNoteId=null`).
After a note is created/renamed, previously-dangling links whose `targetTitle`
matches the note's title are back-filled (`resolved=true`).

## Assets (`/api/projects/:projectId/assets`, `/api/assets`)

| Method | Path | Notes |
|---|---|---|
| GET | `/projects/:projectId/assets` | list; filters `kind`, `status` |
| POST | `/projects/:projectId/assets` | create |
| POST | `/projects/:projectId/assets/bulk` | `{ values: string[], kind }` -> `{ created, updated, skipped }`; upsert on `[projectId,value]` |
| PATCH | `/assets/:id` | update |
| DELETE | `/assets/:id` | delete |

## Files (`/api/files`)

| Method | Path | Notes |
|---|---|---|
| POST | `/files/presign` | `{ filename, mimeType, sizeBytes }` -> `{ uploadUrl, storageKey, expiresIn }` |
| POST | `/files/confirm` | `{ storageKey, sha256, reportId?, noteId? }` -> `Attachment` |
| GET | `/files/:id/download` | 302 redirect to a presigned GET URL |
| DELETE | `/files/:id` | delete object + row |

Rules: max 50 MB; mime allow-list = `image/png, image/jpeg, image/gif,
image/webp, application/pdf, text/plain, application/zip, application/json,
text/csv`. Anything else -> `VALIDATION_ERROR`. Files never stream through the
API. Presign stashes metadata in Redis (`upload:pending:<storageKey>`, TTL 15m)
that `confirm` consumes.

## Audit (`/api/audit`)

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/audit` | ADMIN+ | pagination + filters `entityType, actorId, from, to` |

A global `AuditInterceptor` writes one append-only `AuditLog` row per successful
non-GET request (`actorId, action="<entity>.<verb>", entityType, entityId, ip,
userAgent`). No update/delete endpoints exist for audit rows.

---

## `@bn/shared` exports

Import from `@bn/shared` (never from `@prisma/client` on the frontend).

**common.schema**: `paginationQuerySchema`, `PaginationQuery`,
`PaginationMeta`, `ApiSuccess<T>`, `ApiError`, `ApiErrorDetail`, `ERROR_CODES`,
`ErrorCode`. Prisma enums as Zod enums + inferred types:
`roleSchema/Role`, `reportTypeSchema/ReportType`,
`reportStatusSchema/ReportStatus`, `severitySchema/Severity`,
`projectTypeSchema/ProjectType`, `projectStatusSchema/ProjectStatus`,
`assetKindSchema/AssetKind`, `assetStatusSchema/AssetStatus`.

**auth.schema**: `passwordSchema`, `signupSchema/SignupInput`,
`loginSchema/LoginInput`, `login2faSchema/Login2faInput`,
`enable2faSchema/Enable2faInput`, `disable2faSchema/Disable2faInput`,
`authTokensSchema/AuthTokens`, `login2faRequiredSchema/Login2faRequired`,
`twoFactorSetupSchema/TwoFactorSetup`, `sessionInfoSchema/SessionInfo`.

**project.schema**: `createProjectSchema/CreateProjectInput`,
`updateProjectSchema/UpdateProjectInput`, `projectQuerySchema/ProjectQuery`.

**report.schema**: `createReportSchema/CreateReportInput`,
`updateReportSchema/UpdateReportInput`,
`reportStatusChangeSchema/ReportStatusChangeInput`,
`reportQuerySchema/ReportQuery`.

**note.schema**: `createNoteSchema/CreateNoteInput`,
`updateNoteSchema/UpdateNoteInput`, `noteQuerySchema/NoteQuery`,
`createFolderSchema/CreateFolderInput`, `updateFolderSchema/UpdateFolderInput`,
`NoteGraph`, `NoteGraphNode`, `NoteGraphEdge`.

**asset.schema**: `createAssetSchema/CreateAssetInput`,
`updateAssetSchema/UpdateAssetInput`, `bulkAssetSchema/BulkAssetInput`,
`assetQuerySchema/AssetQuery`, `BulkAssetResult`.

**attachment.schema**: `ALLOWED_MIME_TYPES`, `AllowedMimeType`,
`MAX_FILE_SIZE_BYTES`, `presignSchema/PresignInput`,
`confirmUploadSchema/ConfirmUploadInput`, `PresignResult`.

---

## Extension points for Prompt 2

- `apps/api/src/app.module.ts` — add modules under the
  `// === PROMPT 2 MODULES GO HERE ===` header (commented imports are staged).
- `apps/api/prisma/schema.prisma` — append models **below** the
  `PROMPT 2 APPENDS ITS MODELS BELOW THIS LINE` marker; do not modify above it.
- Infra available via DI (all `@Global`): `PrismaService`, `REDIS` (ioredis
  client, connection only), `StorageService` (MinIO), `CryptoService`
  (AES-256-GCM), the validated `ENV` object.
- Reusable helpers: `ZodValidationPipe`, `@Public()`, `@Roles()`,
  `@CurrentUser()`, `RolesGuard`, `slugify`/`uniqueSlug`, `connectTags`,
  `paginationArgs`/`buildMeta`.
