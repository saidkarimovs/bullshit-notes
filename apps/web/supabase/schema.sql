-- =============================================================================
-- bullshit notes / SkyVision — Supabase schema
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query).
-- It is idempotent: safe to re-run.
--
-- Data model is intentionally aligned with the frontend contract in
-- apps/web/src/types/api.ts (simplified vs. the full self-host Prisma schema).
-- Auth is handled by Supabase Auth (auth.users); every row is owned by a user
-- via owner_id and protected by Row Level Security.
-- =============================================================================

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
-- updated_at trigger helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  type        text not null default 'BOUNTY_PROGRAM'
              check (type in ('BOUNTY_PROGRAM','PENTEST_CLIENT','PERSONAL_RESEARCH')),
  status      text not null default 'ACTIVE'
              check (status in ('ACTIVE','PAUSED','CLOSED','ARCHIVED')),
  platform    text,
  description text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists projects_owner_idx on public.projects (owner_id, created_at desc);

-- ---------------------------------------------------------------------------
-- reports
-- ---------------------------------------------------------------------------
create table if not exists public.reports (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users (id) on delete cascade,
  project_id    uuid references public.projects (id) on delete set null,
  title         text not null,
  type          text not null default 'BBP'
                check (type in ('CVE','BBP','VDP','PENTEST','INTERNAL')),
  severity      text not null default 'INFO'
                check (severity in ('INFO','LOW','MEDIUM','HIGH','CRITICAL')),
  status        text not null default 'DRAFT'
                check (status in ('DRAFT','SUBMITTED','TRIAGED','ACCEPTED','DUPLICATE','REJECTED','PAID')),
  target        text not null default '',
  cvss_score    numeric(3,1),
  bounty_amount numeric(12,2),
  body          text not null default '',
  submitted_at  timestamptz,
  resolved_at   timestamptz,
  paid_at       timestamptz,
  disclosure_deadline timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists reports_owner_idx    on public.reports (owner_id, created_at desc);
create index if not exists reports_project_idx  on public.reports (project_id);
create index if not exists reports_status_idx   on public.reports (owner_id, status);
create index if not exists reports_severity_idx on public.reports (owner_id, severity);
create index if not exists reports_title_trgm   on public.reports using gin (title gin_trgm_ops);

-- status transition history (funnel + timeline)
create table if not exists public.report_events (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users (id) on delete cascade,
  report_id   uuid not null references public.reports (id) on delete cascade,
  from_status text,
  to_status   text not null,
  note        text,
  created_at  timestamptz not null default now()
);
create index if not exists report_events_report_idx on public.report_events (report_id, created_at);

-- ---------------------------------------------------------------------------
-- assets (used for target/asset counts)
-- ---------------------------------------------------------------------------
create table if not exists public.assets (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  kind       text not null default 'DOMAIN'
             check (kind in ('DOMAIN','SUBDOMAIN','IP','URL','ENDPOINT','MOBILE_APP','REPO','CLOUD')),
  value      text not null,
  status     text not null default 'UNVERIFIED'
             check (status in ('IN_SCOPE','OUT_OF_SCOPE','UNVERIFIED')),
  created_at timestamptz not null default now(),
  unique (project_id, value)
);
create index if not exists assets_owner_idx on public.assets (owner_id);

-- ---------------------------------------------------------------------------
-- notes
-- ---------------------------------------------------------------------------
create table if not exists public.notes (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  title      text not null,
  body       text not null default '',
  tags       text[] not null default '{}',
  pinned     boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists notes_owner_idx   on public.notes (owner_id, updated_at desc);
create index if not exists notes_project_idx on public.notes (project_id);
create index if not exists notes_title_trgm  on public.notes using gin (title gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- audit_log (activity feed + heatmap)
-- ---------------------------------------------------------------------------
create table if not exists public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users (id) on delete cascade,
  actor       text not null default 'You',
  action      text not null,
  entity_type text not null,
  entity_id   uuid,
  title       text not null default '',
  created_at  timestamptz not null default now()
);
create index if not exists audit_owner_idx on public.audit_log (owner_id, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
drop trigger if exists projects_updated on public.projects;
create trigger projects_updated before update on public.projects
  for each row execute function public.set_updated_at();

drop trigger if exists reports_updated on public.reports;
create trigger reports_updated before update on public.reports
  for each row execute function public.set_updated_at();

drop trigger if exists notes_updated on public.notes;
create trigger notes_updated before update on public.notes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security — every table is private to its owner.
-- Route handlers use the service role (which bypasses RLS) and additionally
-- filter by owner_id, so these policies are defense-in-depth for any direct
-- anon/authenticated access with the public key.
-- ---------------------------------------------------------------------------
alter table public.projects      enable row level security;
alter table public.reports       enable row level security;
alter table public.report_events enable row level security;
alter table public.assets        enable row level security;
alter table public.notes         enable row level security;
alter table public.audit_log     enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['projects','reports','report_events','assets','notes','audit_log']
  loop
    execute format('drop policy if exists "%s_owner_all" on public.%I;', t, t);
    execute format(
      'create policy "%s_owner_all" on public.%I
         for all
         using (owner_id = auth.uid())
         with check (owner_id = auth.uid());', t, t);
  end loop;
end;
$$;
