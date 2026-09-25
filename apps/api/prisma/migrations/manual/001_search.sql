-- Manual migration: full-text search columns and indexes.
-- Run once after `prisma migrate deploy`. Idempotent where possible.
--
--   psql "$DATABASE_URL" -f prisma/migrations/manual/001_search.sql
--
-- Prompt 2 (search module) depends on these objects existing.

-- Required extension for trigram fallback / fuzzy title match.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------------
-- Report: generated tsvector (title weighted A, body weighted B).
-- ---------------------------------------------------------------------------
ALTER TABLE "Report"
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce("bodyMd", '')), 'B')
  ) STORED;

CREATE INDEX IF NOT EXISTS report_search_vector_idx
  ON "Report" USING GIN (search_vector);

CREATE INDEX IF NOT EXISTS report_title_trgm_idx
  ON "Report" USING GIN (title gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Note: generated tsvector (title weighted A, body weighted B).
-- ---------------------------------------------------------------------------
ALTER TABLE "Note"
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce("bodyMd", '')), 'B')
  ) STORED;

CREATE INDEX IF NOT EXISTS note_search_vector_idx
  ON "Note" USING GIN (search_vector);

CREATE INDEX IF NOT EXISTS note_title_trgm_idx
  ON "Note" USING GIN (title gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Project / Asset: trigram indexes so the same query path can fuzzy-match
-- their names/values without a full tsvector column.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS project_name_trgm_idx
  ON "Project" USING GIN (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS asset_value_trgm_idx
  ON "Asset" USING GIN (value gin_trgm_ops);
