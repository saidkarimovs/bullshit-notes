export type Severity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type ReportStatus = "DRAFT" | "SUBMITTED" | "TRIAGED" | "ACCEPTED" | "DUPLICATE" | "REJECTED" | "PAID";
export type ReportType = "CVE" | "BBP" | "VDP" | "PENTEST" | "INTERNAL";
export type ProjectType = "BOUNTY_PROGRAM" | "PENTEST_CLIENT" | "PERSONAL_RESEARCH";
export type ProjectStatus = "ACTIVE" | "PAUSED" | "CLOSED" | "ARCHIVED";

export interface Report {
  id: string;
  title: string;
  type: ReportType;
  severity: Severity;
  status: ReportStatus;
  target: string;
  projectId: string;
  cvssScore?: number;
  bountyAmount?: string | null;
  updatedAt: string;
  body?: string;
}

export interface Project {
  id: string;
  name: string;
  type: ProjectType;
  status: ProjectStatus;
  platform?: string;
  reportCount: number;
  assetCount: number;
  totalEarned: string;
  description?: string;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  tags: string[];
  projectId?: string;
  pinned?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardOverview {
  totalFindings: number;
  openFindings: number;
  activeTargets: number;
  totalEarned: string;
  trends?: Record<string, number>;
}
export interface SeverityCount { severity: Severity; count: number }
export interface FindingsPoint { date: string; INFO: number; LOW: number; MEDIUM: number; HIGH: number; CRITICAL: number }
export interface FunnelPoint { status: string; count: number; dropOffPct: number }
export interface EarningsPoint { date: string; amount: string; cumulative: string }
export interface HeatmapPoint { date: string; count: number }
export interface VdpPipelineItem { id: string; title: string; slaState: "ON_TRACK" | "DUE_SOON" | "OVERDUE" | "DISCLOSED"; daysRemaining: number; daysElapsed: number }
export interface ActivityItem { id: string; action: string; entityType: string; title: string; createdAt: string; actor: string }
