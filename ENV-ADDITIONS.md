# ENV-ADDITIONS (Prompt 2)

New environment variables introduced by Prompt 2. All are **optional** and read
directly from `process.env` (they are intentionally NOT added to the Prompt 1
validated `env.ts`, so no forbidden file is touched). Add them to `.env` /
`.env.example` as needed.

| Variable                   | Default   | Used by            | Purpose |
|----------------------------|-----------|--------------------|---------|
| `NVD_API_KEY`              | _(unset)_ | `cve` sync worker  | NVD API 2.0 key. Without it, sync sleeps 6s between pages (5 req/30s). With it, 50 req/30s (~0.6s between pages). |
| `AI_REQUEST_TIMEOUT_MS`    | `120000`  | `ai` providers     | Timeout for streaming AI provider calls. (Non-stream test calls use 15s.) |
| `EXPORT_BROWSER_POOL_SIZE` | `1`       | `export` PDF worker| Hint for how many Chromium instances the render worker keeps warm. |
| `WEBHOOK_TIMEOUT_MS`       | `10000`   | `webhooks` worker  | Per-delivery HTTP timeout for outbound webhook POSTs. |

Notes:
- `AI_REQUEST_TIMEOUT_MS` is honored via the AI stream timeout constant; if you
  wire it into `providers/types.ts` change `AI_STREAM_TIMEOUT_MS` to read it.
- Everything else (DB, Redis, S3, MASTER_KEY, JWT) is already provided by
  Prompt 1's validated env and is reused as-is.
