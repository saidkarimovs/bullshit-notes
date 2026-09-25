import type { ActivityItem, DashboardOverview, EarningsPoint, FindingsPoint, FunnelPoint, HeatmapPoint, Note, Project, Report, SeverityCount, VdpPipelineItem } from "@/types/api";

const isoDaysAgo = (days: number) => new Date(Date.now() - days * 86400000).toISOString();
const dateDaysAgo = (days: number) => isoDaysAgo(days).slice(0, 10);

export const demoOverview: DashboardOverview = {
  totalFindings: 142, openFindings: 38, activeTargets: 24, totalEarned: "48250",
  trends: { totalFindings: 12.8, openFindings: -4.2, activeTargets: 8.5, totalEarned: 18.6 },
};
export const demoSeverity: SeverityCount[] = [
  { severity: "CRITICAL", count: 9 }, { severity: "HIGH", count: 28 },
  { severity: "MEDIUM", count: 47 }, { severity: "LOW", count: 39 }, { severity: "INFO", count: 19 },
];
export const demoFindings: FindingsPoint[] = Array.from({ length: 30 }, (_, index) => ({
  date: dateDaysAgo(29 - index),
  INFO: 1 + (index * 7 % 3), LOW: 2 + (index * 11 % 4),
  MEDIUM: 2 + (index * 13 % 5), HIGH: 1 + (index * 5 % 3),
  CRITICAL: index % 8 === 0 ? 2 : index % 5 === 0 ? 1 : 0,
}));
export const demoFunnel: FunnelPoint[] = [
  { status: "Drafted", count: 142, dropOffPct: 0 },
  { status: "Submitted", count: 112, dropOffPct: 21 },
  { status: "Triaged", count: 78, dropOffPct: 30 },
  { status: "Accepted", count: 49, dropOffPct: 37 },
  { status: "Paid", count: 36, dropOffPct: 27 },
];
export const demoEarnings: EarningsPoint[] = [
  1800, 3400, 2100, 4200, 3900, 5100, 2500, 5900, 4400, 3600, 6400, 5750,
].map((amount, index, all) => ({ date: new Date(new Date().getFullYear(), new Date().getMonth() - 11 + index, 1).toISOString(), amount: String(amount), cumulative: String(all.slice(0, index + 1).reduce((sum, n) => sum + n, 0)) }));
export const demoHeatmap: HeatmapPoint[] = Array.from({ length: 365 }, (_, index) => ({
  date: dateDaysAgo(364 - index), count: (index * 17 + Math.floor(index / 7) * 3) % 9 === 0 ? 0 : (index * 7) % 12,
}));
export const demoVdp: VdpPipelineItem[] = [
  { id: "v1", title: "Account enumeration via reset flow", slaState: "OVERDUE", daysRemaining: -3, daysElapsed: 93 },
  { id: "v2", title: "SSRF in PDF preview service", slaState: "DUE_SOON", daysRemaining: 4, daysElapsed: 86 },
  { id: "v3", title: "Stored XSS in profile description", slaState: "ON_TRACK", daysRemaining: 11, daysElapsed: 79 },
];
export const demoActivity: ActivityItem[] = [
  { id: "a1", action: "accepted", entityType: "report", title: "Blind SSRF in webhook handler", actor: "You", createdAt: isoDaysAgo(0.1) },
  { id: "a2", action: "added", entityType: "asset", title: "api.acme.example", actor: "You", createdAt: isoDaysAgo(0.4) },
  { id: "a3", action: "updated", entityType: "note", title: "Authentication research", actor: "You", createdAt: isoDaysAgo(1.2) },
  { id: "a4", action: "submitted", entityType: "report", title: "IDOR in invoice export", actor: "You", createdAt: isoDaysAgo(2.1) },
];
export const demoProjects: Project[] = [
  { id: "p1", name: "Acme Cloud", type: "BOUNTY_PROGRAM", status: "ACTIVE", platform: "HackerOne", reportCount: 32, assetCount: 146, totalEarned: "18600", description: "Primary bug bounty target with broad cloud and API scope." },
  { id: "p2", name: "Northstar Commerce", type: "PENTEST_CLIENT", status: "ACTIVE", platform: "Private", reportCount: 18, assetCount: 64, totalEarned: "12000", description: "Quarterly web application and infrastructure assessment." },
  { id: "p3", name: "Open Source Research", type: "PERSONAL_RESEARCH", status: "ACTIVE", platform: "Independent", reportCount: 12, assetCount: 38, totalEarned: "4200", description: "Public CVE research and responsible disclosure." },
  { id: "p4", name: "Vertex Identity", type: "BOUNTY_PROGRAM", status: "PAUSED", platform: "Bugcrowd", reportCount: 21, assetCount: 92, totalEarned: "13450", description: "Identity and access research." },
];
export const demoReports: Report[] = [
  { id: "r1", title: "Blind SSRF in webhook handler", type: "BBP", severity: "CRITICAL", status: "ACCEPTED", target: "api.acme.example", projectId: "p1", cvssScore: 9.1, bountyAmount: "8500", updatedAt: isoDaysAgo(0.1), body: "# Summary\n\nThe webhook endpoint allows access to internal metadata services.\n\n## Impact\n\nAn attacker may retrieve service credentials." },
  { id: "r2", title: "IDOR in invoice export", type: "PENTEST", severity: "HIGH", status: "SUBMITTED", target: "billing.northstar.example", projectId: "p2", cvssScore: 8.1, updatedAt: isoDaysAgo(1), body: "# Summary\n\nInvoice identifiers are not checked against the authenticated account." },
  { id: "r3", title: "Stored XSS in profile description", type: "VDP", severity: "HIGH", status: "TRIAGED", target: "accounts.vertex.example", projectId: "p4", cvssScore: 7.4, updatedAt: isoDaysAgo(2), body: "# Summary\n\nUntrusted profile content reaches an HTML sink." },
  { id: "r4", title: "CVE-2026-10421: parser overflow", type: "CVE", severity: "CRITICAL", status: "DRAFT", target: "open-source parser", projectId: "p3", cvssScore: 9.8, updatedAt: isoDaysAgo(3), body: "# Summary\n\nA malformed record causes an out-of-bounds write." },
  { id: "r5", title: "Weak reset token entropy", type: "BBP", severity: "MEDIUM", status: "PAID", target: "login.acme.example", projectId: "p1", cvssScore: 6.5, bountyAmount: "2200", updatedAt: isoDaysAgo(5), body: "# Summary\n\nPassword reset tokens have insufficient entropy." },
  { id: "r6", title: "Missing authorization on audit export", type: "PENTEST", severity: "LOW", status: "DRAFT", target: "app.northstar.example", projectId: "p2", cvssScore: 3.7, updatedAt: isoDaysAgo(7), body: "# Summary\n\nA read-only role can access audit exports." },
];
export const demoNotes: Note[] = [
  { id: "n1", title: "Authentication research", body: "# Authentication research\n\n## Reset flows\n\nCheck email enumeration, token lifetime, and reuse.\n\n## Sessions\n\nReview cookie flags and refresh rotation.\n\nRelated: [[Acme Cloud scope]] #auth/recon", tags: ["auth/recon"], projectId: "p1", pinned: true, createdAt: isoDaysAgo(12), updatedAt: isoDaysAgo(1.2) },
  { id: "n2", title: "Acme Cloud scope", body: "# Acme Cloud scope\n\nIn scope: *.acme.example\n\nOut of scope: billing partners.\n\nSee [[Authentication research]] for login paths. #scope", tags: ["scope"], projectId: "p1", createdAt: isoDaysAgo(9), updatedAt: isoDaysAgo(2) },
  { id: "n3", title: "SSRF methodology", body: "# SSRF methodology\n\n- Identify URL fetchers\n- Test redirects and alternate IP notation\n- Probe metadata endpoints carefully\n\n#ssrf #methodology", tags: ["ssrf", "methodology"], createdAt: isoDaysAgo(20), updatedAt: isoDaysAgo(4) },
];
