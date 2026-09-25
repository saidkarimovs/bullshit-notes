# bullshit notes

A self-hosted **security operations workspace** — markdown notes, bug bounty /
VDP / CVE tracking, targets & assets, and a live dashboard. Product UI name:
**SkyVision**.

This is a pnpm + Turborepo monorepo with two deployment paths:

| Path | What runs | Where |
| --- | --- | --- |
| **Hosted (default)** | `apps/web` — Next.js 15 app whose App Router route handlers are the API, backed by Supabase (Auth + Postgres + Storage) | **Netlify + Supabase** |
| **Full self-host** | `apps/api` — NestJS 11 + Prisma + Redis + BullMQ workers + MinIO (every advanced module: CVE sync, PDF export, webhooks, AI proxy…) | Docker on your own host |

The hosted path is what deploys to Netlify. The NestJS backend in `apps/api`
is the complete self-host option and is **not** required for the Netlify
deployment.

---

## Layout

```
bullshit-notes/
  netlify.toml              Netlify build config (base = apps/web)
  apps/
    web/                    Next.js 15 frontend + Supabase API route handlers  ← deployed
      src/app/api/**        the API (serverless functions on Netlify)
      src/lib/supabase/     server-side Supabase clients
      supabase/schema.sql   run this once in the Supabase SQL editor
    api/                    NestJS full self-host backend (optional)
  packages/
    shared/                 Zod schemas + shared types
    config/                 shared tsconfig / eslint
  docker/                   Caddyfile + Dockerfiles (self-host)
  docker-compose.yml        full self-host stack
```

---

## Deploy to Netlify + Supabase (hosted path)

### 1. Create a Supabase project
- <https://supabase.com> → New project. Note the project URL and keys from
  **Project Settings → API** (`anon` public key and `service_role` secret key).
- **Authentication → Providers → Email**: turn **off** "Confirm email" so signup
  logs in immediately (the API confirms accounts server-side).
- **SQL Editor → New query**: paste and run `apps/web/supabase/schema.sql`.

### 2. Deploy the frontend on Netlify
- New site → import this GitHub repo. `netlify.toml` sets the base directory to
  `apps/web` and enables the Next.js runtime automatically.
- **Site settings → Environment variables**, add:

  | Key | Value |
  | --- | --- |
  | `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` |
  | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your anon public key |
  | `SUPABASE_SERVICE_ROLE_KEY` | your service role key (secret) |
  | `NEXT_PUBLIC_DEMO_MODE` | `false` |

- Redeploy. Sign up in the app — a starter workspace is seeded for your account.

> The very first deploy runs with `NEXT_PUBLIC_DEMO_MODE=true` (set in
> `netlify.toml`) so the site is live and browsable immediately with seeded
> in-browser data. Flip it to `false` after the Supabase variables are set.

### Local development

```bash
cd apps/web
cp .env.example .env.local     # set NEXT_PUBLIC_DEMO_MODE and Supabase keys
npm install
npm run dev                    # http://localhost:3000
```

`NEXT_PUBLIC_DEMO_MODE=true` explores the UI with no backend. Set it to `false`
with the Supabase keys present to run against real data.

---

## Full self-host backend (optional, `apps/api`)

The NestJS backend implements the complete platform (auth with 2FA, projects,
reports, notes, assets, files, plus stats, search, AI proxy, CVE sync, bounty,
VDP, payloads, checklists, vault, export, import, webhooks and BullMQ workers).
It needs PostgreSQL, Redis and S3/MinIO and does not run on Netlify.

```bash
corepack enable                       # pnpm 9
pnpm install
cp .env.example .env                  # set JWT_SECRET, MASTER_KEY (32-byte base64), etc.
docker compose up -d postgres redis minio
pnpm --filter @bn/api db:generate
pnpm --filter @bn/api db:migrate:dev
pnpm --filter @bn/api db:seed
pnpm --filter @bn/api dev             # API on :4000 under /api
```

Seed owner: `admin@local` / `ChangeMe123456` — change immediately. Tests:
`pnpm --filter @bn/api test`. Full stack in Docker: `docker compose up --build`.

See `CONTRACT.md` and `CONTRACT-2.md` for the full NestJS API surface.

---

## Security notes

- Real secrets never live in the repo — only `.env.example` files are committed.
  `SUPABASE_SERVICE_ROLE_KEY` is read only in server-side route handlers.
- Every hosted API query is scoped to the authenticated user; Supabase Row Level
  Security is enabled on every table as defense-in-depth.
- Markdown from reports/notes is treated as hostile input and sanitized on render.
```
