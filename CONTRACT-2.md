# API CONTRACT (Prompt 2)

Extends `CONTRACT.md`. Same response envelope (`{ data }` / `{ data, meta }` /
`{ error }`), same auth (Bearer access token), same error codes. All routes are
under `/api`. List handlers return `{ items, meta }`; everything else returns a
bare payload. Money is always serialized as a **string**.

---

## Jobs (`/api/jobs`)

| Method | Path | Role | Response `data` |
|---|---|---|---|
| GET | `/jobs/status` | ADMIN+ | `{ queues: [{ name, waiting, active, completed, failed, delayed, paused }] }` |

BullMQ queues: `cve-sync`, `pdf-render`, `sla-check`, `webhook-dispatch`,
`note-embed`. Repeatable on boot: `cve-sync` every 6h, `sla-check` daily 08:00 UTC.
Default job opts: attempts 3, exponential backoff 5000ms, removeOnComplete 100,
removeOnFail 500.

## Stats (`/api/stats`) — every endpoint accepts `from`/`to` (default last 90 days)

| Method | Path | Response `data` |
|---|---|---|
| GET | `/stats/overview` | `{ totalReports, openReports, totalProjects, activeProjects, totalAssets, inScopeAssets, totalNotes, totalEarnings:{amount,currency}, pendingEarnings, avgTimeToTriageHours, duplicateRate }` |
| GET | `/stats/severity` | `[{ severity, count }]` — all 5, zero-filled |
| GET | `/stats/findings-over-time?bucket=day\|week\|month` | `[{ date, INFO, LOW, MEDIUM, HIGH, CRITICAL }]` zero-filled via SQL generate_series |
| GET | `/stats/status-funnel` | `[{ status, count, dropOffPct }]` in DRAFT,SUBMITTED,TRIAGED,ACCEPTED,PAID |
| GET | `/stats/earnings?bucket=month` | `[{ date, amount, cumulative }]` (strings) from `paidAt`/`bountyAmount` |
| GET | `/stats/activity-heatmap?days=365` | `[{ date, count }]` from AuditLog, zero-filled |
| GET | `/stats/by-project` | `[{ projectId, name, reports, critical, earnings }]` |

## Search (`/api/search`)

| Method | Path | Response `data` |
|---|---|---|
| GET | `/search?q=&types=report,note,project,asset&limit=20` | `{ report:[], note:[], project:[], asset:[] }` |

Each hit: `{ id, type, title, snippet, score, projectName? }`. Postgres FTS with
`ts_rank_cd` + `ts_headline` (`<mark>` marks); `q` < 3 chars falls back to
trigram similarity on title. Requires `migrations/manual/001_search.sql`.

## AI (`/api/ai`)

| Method | Path | Body | Response `data` |
|---|---|---|---|
| GET | `/ai/settings` | — | `{ provider, model, keyPreview:"sk-...aF3x", configured, baseUrl?, maxTokens, temperature, monthlyTokenBudget?, tokensUsedThisMonth }` or `null` |
| POST | `/ai/settings` | `{ provider, apiKey, model, baseUrl?, maxTokens?, temperature?, monthlyTokenBudget? }` | public view (as GET). Makes a test call first; on failure → `UPSTREAM_ERROR`, saves nothing. Key stored encrypted, never returned. |
| DELETE | `/ai/settings` | — | `{ ok: true }` |
| POST | `/ai/test` | `{ provider, apiKey, model, baseUrl? }` | `{ ok, latencyMs }` |
| POST | `/ai/complete` | `{ action, content, selection?, context?, instruction? }` | **SSE** `text/event-stream` |

`action` ∈ `summarize, improve, expand, fix-grammar, to-report, explain-cve,
suggest-tags, custom`. SSE emits `data: {"type":"delta","text"}` …,
`data: {"type":"done","usage":{input,output}}`, then `data: [DONE]`; provider
failure emits `data: {"type":"error","message"}` then `[DONE]`. Rate limit 20/hr
per user (pre-flight → `RATE_LIMITED` JSON before streaming). Monthly token
budget exceeded → `RATE_LIMITED` before calling the provider. Providers:
Anthropic `/v1/messages`, OpenAI/compatible `/v1/chat/completions`, Ollama
`/api/chat`.

## CVE (`/api/cve`)

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/cve?q=&severity=&isKev=&from=&to=&page=&perPage=` | any | paginated `{ items, meta }` |
| GET | `/cve/stats` | any | `{ total, kevCount, last7Days, bySeverity }` |
| POST | `/cve/sync` | ADMIN+ | enqueues cve-sync → `{ enqueued, jobId }` |
| GET | `/cve/watches` | any | own watches |
| POST | `/cve/watches` | any | `{ keyword, kind }`, kind ∈ VENDOR/PRODUCT/KEYWORD/CWE |
| DELETE | `/cve/watches/:id` | any | own only |
| GET | `/cve/bookmarks` | any | own bookmarks |
| POST | `/cve/bookmarks` | any | `{ cveId, notes? }` |
| DELETE | `/cve/bookmarks/:id` | any | own only |
| GET | `/cve/:cveId` | any | single CVE |

Sync: NVD API 2.0 (incremental via lastMod window ≤120d, 2000/page, sleeps
6s/0.6s with `NVD_API_KEY`), CISA KEV (`isKev`,`kevDueDate`), EPSS (≤100/call).
New watch matches enqueue `webhook-dispatch`.

## Bounty (`/api/bounty`)

| Method | Path | Notes |
|---|---|---|
| GET | `/bounty/overview` | `{ totalEarned, pendingPayout, avgBounty, highestBounty, acceptanceRate, duplicateRate, reportsSubmitted, avgHoursToFirstResponse, earningsPerHour }` — money strings; `earningsPerHour` is `null` with no sessions |
| GET | `/bounty/programs` | BOUNTY_PROGRAM projects w/ aggregated reports, earnings, acceptanceRate |
| GET | `/bounty/leaderboard?by=earnings\|count&bucket=month` | `[{ bucket, value }]` |
| POST | `/bounty/sessions/start` | `{ projectId? }` — 409 if one already open |
| POST | `/bounty/sessions/:id/stop` | stamps `endedAt`,`durationSec` |
| GET | `/bounty/sessions?from=&to=` | own sessions |

## VDP (`/api/vdp`)

| Method | Path | Notes |
|---|---|---|
| GET | `/vdp/pipeline` | VDP reports + `{ daysElapsed, daysRemaining, deadline, slaState }`; slaState ON_TRACK/DUE_SOON(≤14d)/OVERDUE/DISCLOSED; policy 90d from submittedAt, disclosureDeadline overrides |
| GET | `/vdp/reports/:id/events` | timeline |
| POST | `/vdp/reports/:id/events` | `{ kind, body, occurredAt? }` |
| POST | `/vdp/reports/:id/extend` | `{ days, reason }` → new deadline + EXTENSION_GRANTED event |
| POST | `/vdp/reports/:id/disclose` | `{ publicUrl? }` → sets disclosedAt + DISCLOSED event |
| GET | `/vdp/contacts?projectId=` | contacts |
| POST | `/vdp/contacts` | `{ projectId, name, email, role? }` |
| PATCH | `/vdp/contacts/:id` | partial |
| DELETE | `/vdp/contacts/:id` | delete |

`sla-check` daily 08:00 UTC notifies at 14/7/1/0 days remaining, deduped via a
Redis set `vdp:sla:<reportId>:<threshold>`, enqueuing `webhook-dispatch`.

## Payloads (`/api/payloads`)

| Method | Path | Notes |
|---|---|---|
| GET | `/payloads?category=&q=` | list |
| POST | `/payloads` | `{ title, category, body, language?, description?, source? }`; `variables` auto-extracted from `{{NAME}}` |
| GET | `/payloads/:id` | single |
| PATCH | `/payloads/:id` | owner only |
| DELETE | `/payloads/:id` | owner only |
| POST | `/payloads/:id/render` | `{ vars }` → `{ rendered, unresolved[] }` |
| POST | `/payloads/:id/used` | increments `usageCount` |

Categories: XSS, SQLI, SSTI, SSRF, XXE, RCE, LFI, IDOR, CSRF, JWT,
DESERIALIZATION, RECON, BYPASS, OTHER. 40 built-ins seeded when the table is
empty.

## Checklists (`/api/checklists`, `/api/checklist-templates`)

| Method | Path | Notes |
|---|---|---|
| GET | `/checklists?projectId=` | list |
| POST | `/checklists` | `{ templateId?, projectId, name? }` (copies template items) |
| PATCH | `/checklists/:id/items/:itemId` | `{ state, noteId? }` state ∈ todo/pass/fail/na |
| GET | `/checklists/:id/progress` | `{ total, pass, fail, na, todo, pct }` (N/A excluded from pct) |
| GET | `/checklist-templates` | built-in + custom |
| POST | `/checklist-templates` | `{ name, framework, description, items[] }` |

Built-ins seeded on boot: OWASP WSTG v4.2 (42 items), OWASP API Security Top 10
(10), OWASP MASVS (20).

## Vault (`/api/vault`)

| Method | Path | Notes |
|---|---|---|
| GET | `/vault?projectId=` | entries **without** secret |
| POST | `/vault` | `{ projectId, label, username?, secret, kind, url?, notes? }` |
| POST | `/vault/:id/reveal` | `{ password }` → `{ secret, expiresInSec:30 }`; re-verifies login password (argon2), writes AuditLog `vault.reveal`, 10 reveals/hr |
| PATCH | `/vault/:id` | owner only |
| DELETE | `/vault/:id` | owner only |

`kind` ∈ PASSWORD, API_KEY, TOKEN, SSH_KEY, CERTIFICATE, OTHER.

## Export (`/api/export`)

| Method | Path | Notes |
|---|---|---|
| POST | `/export/report/:id` | `{ template? }` → **202** `{ jobId }` |
| POST | `/export/note/:id` | 202 `{ jobId }` |
| POST | `/export/project/:id` | 202 `{ jobId }` (full engagement report) |
| GET | `/export/jobs/:jobId` | `{ state, progress, downloadUrl? }` |
| GET | `/export/data?format=json\|markdown` | zip stream (notes+reports as files + manifest.json) |

`pdf-render` renders sanitized Markdown → HTML (remark-gfm/math, rehype-highlight,
**rehype-sanitize**) in a print A4 layout with cover + header/footer, via one
reused Playwright Chromium (context per job, 30s timeout), uploads to
`exports/<userId>/<uuid>.pdf`, presigned 1h.

## Import (`/api/import`)

| Method | Path | Notes |
|---|---|---|
| POST | `/import/pdf` | multipart ≤25MB → `{ markdown, pageCount, warnings[] }` (no save) |
| POST | `/import/markdown` | multipart `.md` or `.zip` → `{ documents[], warnings[] }` (frontmatter parsed, `[[wikilinks]]` preserved; no save) |
| POST | `/import/nuclei` | `{ projectId, results[] }` (jsonl) → `{ created, assetsUpserted }`; one DRAFT Report per template-id+host, host upserted as Asset |
| POST | `/import/recon` | `{ projectId, kind, lines[] }` → `{ created, updated, skipped }` bulk asset upsert |

## Webhooks (`/api/webhooks`)

| Method | Path | Notes |
|---|---|---|
| GET | `/webhooks` | own webhooks |
| POST | `/webhooks` | `{ url, kind, events[], secret? }` |
| PATCH | `/webhooks/:id` | owner only |
| DELETE | `/webhooks/:id` | owner only |
| POST | `/webhooks/:id/test` | enqueues a synthetic event |

`kind` ∈ DISCORD, SLACK, TELEGRAM, GENERIC. Events: report.created,
report.status_changed, report.paid, cve.watch_match, vdp.sla_warning,
vdp.overdue, asset.new. Dispatch formats per platform (Discord embeds colored by
severity, Slack Block Kit, Telegram HTML `sendMessage` where `secret`=chat_id &
`url`=bot endpoint, GENERIC signed with HMAC-SHA256 in `X-BN-Signature`). Retries
3× (queue policy); 10 consecutive failures set `active=false`.
