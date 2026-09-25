import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Note, Project, Report } from "@/types/api";

/**
 * Shared DB-row → frontend-DTO mappers and the new-user seeder.
 *
 * Every table uses snake_case columns (see supabase/schema.sql); the frontend
 * contract (types/api.ts) is camelCase. Money/decimal columns come back from
 * supabase-js as either numbers or strings depending on the driver, so every
 * money field is normalised to a STRING and cvssScore to a NUMBER (or omitted).
 */

const DAY = 86_400_000;
const isoDaysAgo = (days: number) => new Date(Date.now() - days * DAY).toISOString();

/** Money/decimal → string (or null). Never emit a raw number for money. */
export function moneyStr(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  return String(value);
}

/** numeric → number (or undefined when null). Used for cvssScore. */
export function numOrUndef(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const n = Number(value);
  return Number.isNaN(n) ? undefined : n;
}

// ---------------------------------------------------------------------------
// Row shapes (only the columns we read)
// ---------------------------------------------------------------------------
export interface ProjectRow {
  id: string;
  name: string;
  type: string;
  status: string;
  platform: string | null;
  description: string | null;
}

export interface ReportRow {
  id: string;
  project_id: string | null;
  title: string;
  type: string;
  severity: string;
  status: string;
  target: string | null;
  cvss_score: number | string | null;
  bounty_amount: number | string | null;
  body: string | null;
  submitted_at: string | null;
  resolved_at: string | null;
  paid_at: string | null;
  disclosure_deadline: string | null;
  created_at: string;
  updated_at: string;
}

export interface NoteRow {
  id: string;
  project_id: string | null;
  title: string;
  body: string | null;
  tags: string[] | null;
  pinned: boolean | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------
export function mapProject(
  row: ProjectRow,
  counts: { reportCount: number; assetCount: number; totalEarned: string },
): Project {
  const project: Project = {
    id: row.id,
    name: row.name,
    type: row.type as Project["type"],
    status: row.status as Project["status"],
    reportCount: counts.reportCount,
    assetCount: counts.assetCount,
    totalEarned: counts.totalEarned,
  };
  if (row.platform) project.platform = row.platform;
  if (row.description) project.description = row.description;
  return project;
}

export function mapReport(row: ReportRow): Report {
  const report: Report = {
    id: row.id,
    title: row.title,
    type: row.type as Report["type"],
    severity: row.severity as Report["severity"],
    status: row.status as Report["status"],
    target: row.target ?? "",
    projectId: row.project_id ?? "",
    bountyAmount: moneyStr(row.bounty_amount),
    updatedAt: row.updated_at,
    body: row.body ?? "",
  };
  const cvss = numOrUndef(row.cvss_score);
  if (cvss !== undefined) report.cvssScore = cvss;
  return report;
}

export function mapNote(row: NoteRow): Note {
  const note: Note = {
    id: row.id,
    title: row.title,
    body: row.body ?? "",
    tags: row.tags ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (row.project_id) note.projectId = row.project_id;
  if (row.pinned) note.pinned = row.pinned;
  return note;
}

// ---------------------------------------------------------------------------
// Seeder
// ---------------------------------------------------------------------------
type Db = SupabaseClient;

/**
 * Insert a small, realistic starter workspace for a brand-new user so the
 * dashboard is not empty. Resilient: any failing insert is logged and skipped
 * — seeding must NEVER break signup.
 */
export async function seedForUser(db: Db, userId: string): Promise<void> {
  try {
    // -- projects ----------------------------------------------------------
    const { data: projects, error: projectError } = await db
      .from("projects")
      .insert([
        {
          owner_id: userId,
          name: "Acme Cloud",
          type: "BOUNTY_PROGRAM",
          status: "ACTIVE",
          platform: "HackerOne",
          description: "Primary bug bounty target with broad cloud and API scope.",
        },
        {
          owner_id: userId,
          name: "Northstar Commerce",
          type: "PENTEST_CLIENT",
          status: "ACTIVE",
          platform: "Private",
          description: "Quarterly web application and infrastructure assessment.",
        },
        {
          owner_id: userId,
          name: "Open Source Research",
          type: "PERSONAL_RESEARCH",
          status: "ACTIVE",
          platform: "Independent",
          description: "Public CVE research and responsible disclosure.",
        },
      ])
      .select("id, name");
    if (projectError) throw projectError;

    const byName = new Map((projects ?? []).map(p => [p.name as string, p.id as string]));
    const acme = byName.get("Acme Cloud") ?? null;
    const northstar = byName.get("Northstar Commerce") ?? null;
    const research = byName.get("Open Source Research") ?? null;

    // -- reports -----------------------------------------------------------
    const reports = [
      {
        owner_id: userId,
        project_id: acme,
        title: "Blind SSRF in webhook handler",
        type: "BBP",
        severity: "CRITICAL",
        status: "PAID",
        target: "api.acme.example",
        cvss_score: 9.1,
        bounty_amount: 8500,
        body: "# Summary\n\nThe webhook endpoint allows access to internal metadata services.\n\n## Impact\n\nAn attacker may retrieve service credentials.",
        submitted_at: isoDaysAgo(24),
        resolved_at: isoDaysAgo(12),
        paid_at: isoDaysAgo(6),
      },
      {
        owner_id: userId,
        project_id: acme,
        title: "Weak reset token entropy",
        type: "BBP",
        severity: "MEDIUM",
        status: "PAID",
        target: "login.acme.example",
        cvss_score: 6.5,
        bounty_amount: 2200,
        body: "# Summary\n\nPassword reset tokens have insufficient entropy.",
        submitted_at: isoDaysAgo(40),
        resolved_at: isoDaysAgo(30),
        paid_at: isoDaysAgo(20),
      },
      {
        owner_id: userId,
        project_id: northstar,
        title: "IDOR in invoice export",
        type: "PENTEST",
        severity: "HIGH",
        status: "SUBMITTED",
        target: "billing.northstar.example",
        cvss_score: 8.1,
        body: "# Summary\n\nInvoice identifiers are not checked against the authenticated account.",
        submitted_at: isoDaysAgo(2),
      },
      {
        owner_id: userId,
        project_id: northstar,
        title: "Missing authorization on audit export",
        type: "PENTEST",
        severity: "LOW",
        status: "DRAFT",
        target: "app.northstar.example",
        cvss_score: 3.7,
        body: "# Summary\n\nA read-only role can access audit exports.",
      },
      {
        owner_id: userId,
        project_id: acme,
        title: "Stored XSS in profile description",
        type: "VDP",
        severity: "HIGH",
        status: "TRIAGED",
        target: "accounts.acme.example",
        cvss_score: 7.4,
        body: "# Summary\n\nUntrusted profile content reaches an HTML sink.",
        submitted_at: isoDaysAgo(86),
        resolved_at: isoDaysAgo(70),
      },
      {
        owner_id: userId,
        project_id: research,
        title: "CVE-2026-10421: parser overflow",
        type: "CVE",
        severity: "CRITICAL",
        status: "DRAFT",
        target: "open-source parser",
        cvss_score: 9.8,
        body: "# Summary\n\nA malformed record causes an out-of-bounds write.",
      },
    ];
    const { error: reportError } = await db.from("reports").insert(reports);
    if (reportError) throw reportError;

    // -- assets ------------------------------------------------------------
    const assets = [
      { owner_id: userId, project_id: acme, kind: "DOMAIN", value: "acme.example", status: "IN_SCOPE" },
      { owner_id: userId, project_id: acme, kind: "SUBDOMAIN", value: "api.acme.example", status: "IN_SCOPE" },
      { owner_id: userId, project_id: acme, kind: "SUBDOMAIN", value: "login.acme.example", status: "IN_SCOPE" },
      { owner_id: userId, project_id: northstar, kind: "DOMAIN", value: "northstar.example", status: "IN_SCOPE" },
      { owner_id: userId, project_id: northstar, kind: "SUBDOMAIN", value: "billing.northstar.example", status: "IN_SCOPE" },
      { owner_id: userId, project_id: research, kind: "REPO", value: "github.com/example/parser", status: "IN_SCOPE" },
    ];
    const { error: assetError } = await db.from("assets").insert(assets);
    if (assetError) throw assetError;

    // -- notes -------------------------------------------------------------
    const notes = [
      {
        owner_id: userId,
        project_id: acme,
        title: "Authentication research",
        body: "# Authentication research\n\n## Reset flows\n\nCheck email enumeration, token lifetime, and reuse.\n\n## Sessions\n\nReview cookie flags and refresh rotation. #auth/recon",
        tags: ["auth/recon"],
        pinned: true,
      },
      {
        owner_id: userId,
        project_id: acme,
        title: "Acme Cloud scope",
        body: "# Acme Cloud scope\n\nIn scope: *.acme.example\n\nOut of scope: billing partners. #scope",
        tags: ["scope"],
        pinned: false,
      },
      {
        owner_id: userId,
        project_id: null,
        title: "SSRF methodology",
        body: "# SSRF methodology\n\n- Identify URL fetchers\n- Test redirects and alternate IP notation\n- Probe metadata endpoints carefully\n\n#ssrf #methodology",
        tags: ["ssrf", "methodology"],
        pinned: false,
      },
    ];
    const { error: noteError } = await db.from("notes").insert(notes);
    if (noteError) throw noteError;

    // -- audit log (activity feed + heatmap), spread over recent days ------
    const audit = [
      { owner_id: userId, actor: "You", action: "created", entity_type: "report", title: "Blind SSRF in webhook handler", created_at: isoDaysAgo(24) },
      { owner_id: userId, actor: "You", action: "status_changed", entity_type: "report", title: "Blind SSRF in webhook handler", created_at: isoDaysAgo(6) },
      { owner_id: userId, actor: "You", action: "created", entity_type: "note", title: "Authentication research", created_at: isoDaysAgo(12) },
      { owner_id: userId, actor: "You", action: "created", entity_type: "report", title: "IDOR in invoice export", created_at: isoDaysAgo(2) },
      { owner_id: userId, actor: "You", action: "created", entity_type: "project", title: "Northstar Commerce", created_at: isoDaysAgo(9) },
      { owner_id: userId, actor: "You", action: "updated", entity_type: "note", title: "SSRF methodology", created_at: isoDaysAgo(4) },
      { owner_id: userId, actor: "You", action: "created", entity_type: "report", title: "Stored XSS in profile description", created_at: isoDaysAgo(86) },
      { owner_id: userId, actor: "You", action: "status_changed", entity_type: "report", title: "Weak reset token entropy", created_at: isoDaysAgo(20) },
    ];
    const { error: auditError } = await db.from("audit_log").insert(audit);
    if (auditError) throw auditError;
  } catch (error) {
    console.error("[seed] failed to seed starter data:", error);
  }
}
