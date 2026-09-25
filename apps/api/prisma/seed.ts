/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "item"
  );
}

const WIKILINK_RE = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
function parseWikilinks(body: string): string[] {
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  WIKILINK_RE.lastIndex = 0;
  while ((m = WIKILINK_RE.exec(body)) !== null) {
    const t = m[1]?.trim();
    if (t) out.add(t);
  }
  return [...out];
}

async function main(): Promise<void> {
  console.log("Seeding bullshit-notes...");

  // ---- Owner user ----
  const passwordHash = await argon2.hash("ChangeMe123456", {
    type: argon2.argon2id,
  });
  const owner = await prisma.user.upsert({
    where: { email: "admin@local" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@local",
      passwordHash,
      role: "OWNER",
    },
  });
  console.log(`  owner: ${owner.email}`);

  // ---- Tags (10) ----
  const tagNames = [
    "xss",
    "sqli",
    "ssrf",
    "idor",
    "rce",
    "auth",
    "recon",
    "mobile",
    "cloud",
    "priv-esc",
  ];
  const tags = await Promise.all(
    tagNames.map((name) =>
      prisma.tag.upsert({
        where: { name },
        update: {},
        create: { name, slug: slugify(name) },
      }),
    ),
  );
  console.log(`  tags: ${tags.length}`);

  // ---- Projects (2) ----
  const acme = await prisma.project.upsert({
    where: { slug: "acme-bug-bounty" },
    update: {},
    create: {
      name: "Acme Bug Bounty",
      slug: "acme-bug-bounty",
      type: "BOUNTY_PROGRAM",
      status: "ACTIVE",
      platform: "HackerOne",
      programUrl: "https://hackerone.com/acme",
      scopeNotesMd: "In scope: *.acme.com, api.acme.com",
      payoutMin: 100,
      payoutMax: 10000,
      currency: "USD",
      ownerId: owner.id,
      startedAt: new Date("2025-01-01"),
      tags: { connect: [{ id: tags[0].id }, { id: tags[1].id }] },
    },
  });
  const initech = await prisma.project.upsert({
    where: { slug: "initech-pentest" },
    update: {},
    create: {
      name: "Initech Pentest",
      slug: "initech-pentest",
      type: "PENTEST_CLIENT",
      status: "ACTIVE",
      platform: null,
      nda: true,
      currency: "USD",
      ownerId: owner.id,
      startedAt: new Date("2025-06-15"),
      tags: { connect: [{ id: tags[3].id }] },
    },
  });
  console.log(`  projects: 2`);

  // ---- Reports (6) across severities and statuses ----
  const reportDefs = [
    {
      title: "Reflected XSS on search",
      type: "BBP" as const,
      status: "SUBMITTED" as const,
      severity: "LOW" as const,
      projectId: acme.id,
      tagIds: [tags[0].id],
    },
    {
      title: "Blind SQL injection in login",
      type: "BBP" as const,
      status: "TRIAGED" as const,
      severity: "HIGH" as const,
      projectId: acme.id,
      tagIds: [tags[1].id],
    },
    {
      title: "SSRF via webhook fetch",
      type: "BBP" as const,
      status: "ACCEPTED" as const,
      severity: "CRITICAL" as const,
      projectId: acme.id,
      tagIds: [tags[2].id],
    },
    {
      title: "IDOR on invoice endpoint",
      type: "PENTEST" as const,
      status: "PAID" as const,
      severity: "MEDIUM" as const,
      projectId: initech.id,
      tagIds: [tags[3].id],
    },
    {
      title: "Verbose error disclosure",
      type: "INTERNAL" as const,
      status: "REJECTED" as const,
      severity: "INFO" as const,
      projectId: initech.id,
      tagIds: [],
    },
    {
      title: "Duplicate XSS on profile",
      type: "BBP" as const,
      status: "DRAFT" as const,
      severity: "LOW" as const,
      projectId: acme.id,
      tagIds: [tags[0].id],
    },
  ];

  for (const def of reportDefs) {
    await prisma.report.upsert({
      where: { slug: slugify(def.title) },
      update: {},
      create: {
        title: def.title,
        slug: slugify(def.title),
        type: def.type,
        status: def.status,
        severity: def.severity,
        bodyMd: `# ${def.title}\n\nDetails go here.`,
        projectId: def.projectId,
        authorId: owner.id,
        submittedAt:
          def.status === "DRAFT" ? null : new Date("2025-07-01"),
        resolvedAt: ["ACCEPTED", "PAID", "REJECTED", "DUPLICATE"].includes(
          def.status,
        )
          ? new Date("2025-07-10")
          : null,
        paidAt: def.status === "PAID" ? new Date("2025-07-20") : null,
        bountyAmount: def.status === "PAID" ? "1500.00" : null,
        bountyCurrency: def.status === "PAID" ? "USD" : null,
        ...(def.tagIds.length
          ? { tags: { connect: def.tagIds.map((id) => ({ id })) } }
          : {}),
      },
    });
  }
  console.log(`  reports: ${reportDefs.length}`);

  // ---- Assets (12) ----
  const assetDefs: {
    projectId: string;
    kind:
      | "DOMAIN"
      | "SUBDOMAIN"
      | "IP"
      | "URL"
      | "ENDPOINT"
      | "MOBILE_APP"
      | "REPO"
      | "CLOUD";
    value: string;
    status: "IN_SCOPE" | "OUT_OF_SCOPE" | "UNVERIFIED";
  }[] = [
    { projectId: acme.id, kind: "DOMAIN", value: "acme.com", status: "IN_SCOPE" },
    { projectId: acme.id, kind: "SUBDOMAIN", value: "api.acme.com", status: "IN_SCOPE" },
    { projectId: acme.id, kind: "SUBDOMAIN", value: "dev.acme.com", status: "UNVERIFIED" },
    { projectId: acme.id, kind: "URL", value: "https://acme.com/login", status: "IN_SCOPE" },
    { projectId: acme.id, kind: "IP", value: "203.0.113.10", status: "IN_SCOPE" },
    { projectId: acme.id, kind: "ENDPOINT", value: "/api/v1/users", status: "IN_SCOPE" },
    { projectId: acme.id, kind: "MOBILE_APP", value: "com.acme.app", status: "OUT_OF_SCOPE" },
    { projectId: acme.id, kind: "REPO", value: "github.com/acme/web", status: "UNVERIFIED" },
    { projectId: initech.id, kind: "DOMAIN", value: "initech.local", status: "IN_SCOPE" },
    { projectId: initech.id, kind: "SUBDOMAIN", value: "vpn.initech.local", status: "IN_SCOPE" },
    { projectId: initech.id, kind: "CLOUD", value: "s3://initech-backups", status: "UNVERIFIED" },
    { projectId: initech.id, kind: "IP", value: "10.0.0.5", status: "IN_SCOPE" },
  ];
  for (const a of assetDefs) {
    await prisma.asset.upsert({
      where: { projectId_value: { projectId: a.projectId, value: a.value } },
      update: {},
      create: a,
    });
  }
  console.log(`  assets: ${assetDefs.length}`);

  // ---- Notes (8): >=3 with wikilinks, one dangling ----
  const noteDefs = [
    {
      title: "Recon Playbook",
      body: "Start with [[Subdomain Enumeration]] then review [[Acme Bug Bounty Scope]].",
    },
    {
      title: "Subdomain Enumeration",
      body: "Use amass and subfinder. See [[Recon Playbook]] for context.",
    },
    {
      title: "Acme Bug Bounty Scope",
      body: "Wildcard *.acme.com. Payout up to $10k.",
    },
    {
      title: "SSRF Notes",
      body: "Cloud metadata endpoints. Related: [[Nonexistent Note]] (dangling on purpose).",
    },
    { title: "SQLi Cheatsheet", body: "UNION based and blind techniques." },
    { title: "XSS Cheatsheet", body: "Reflected, stored, DOM." },
    { title: "Report Template", body: "Title, Summary, Steps, Impact, Fix." },
    { title: "Daily Log", body: "2025-07-01: triaged the SSRF finding." },
  ];

  const createdNotes = new Map<string, string>();
  for (const n of noteDefs) {
    const note = await prisma.note.upsert({
      where: { slug: slugify(n.title) },
      update: {},
      create: {
        title: n.title,
        slug: slugify(n.title),
        bodyMd: n.body,
        authorId: owner.id,
        frontmatter: {},
      },
    });
    createdNotes.set(n.title.toLowerCase(), note.id);
  }

  // Index wikilinks (resolve against created notes; leave unknowns dangling).
  for (const n of noteDefs) {
    const sourceId = createdNotes.get(n.title.toLowerCase());
    if (!sourceId) continue;
    await prisma.noteLink.deleteMany({ where: { sourceNoteId: sourceId } });
    for (const target of parseWikilinks(n.body)) {
      const targetId = createdNotes.get(target.toLowerCase()) ?? null;
      await prisma.noteLink.upsert({
        where: {
          sourceNoteId_targetTitle: {
            sourceNoteId: sourceId,
            targetTitle: target,
          },
        },
        update: { targetNoteId: targetId, resolved: targetId != null },
        create: {
          sourceNoteId: sourceId,
          targetTitle: target,
          targetNoteId: targetId,
          resolved: targetId != null,
        },
      });
    }
  }
  console.log(`  notes: ${noteDefs.length} (1 dangling link seeded)`);

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
