import type { Severity } from "@/types/api";
import { cn } from "@/lib/utils";

const severityClass: Record<Severity, string> = {
  INFO: "text-sev-info border-sev-info bg-sev-info/10",
  LOW: "text-sev-low border-sev-low bg-sev-low/10",
  MEDIUM: "text-sev-medium border-sev-medium bg-sev-medium/10",
  HIGH: "text-sev-high border-sev-high bg-sev-high/10",
  CRITICAL: "text-sev-critical border-sev-critical bg-sev-critical/10",
};

export function SeverityBadge({ severity, score, size = "md" }: { severity: Severity; score?: number; size?: "sm" | "md" }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-sm border font-medium uppercase tracking-[.04em]", severityClass[severity], size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-[11px]")}>{severity}{score !== undefined && <span className="mono">{score.toFixed(1)}</span>}</span>;
}
