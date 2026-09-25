import type { ReportStatus } from "@/types/api";
import { cn } from "@/lib/utils";

const colors: Record<ReportStatus, string> = {
  DRAFT: "text-muted", SUBMITTED: "text-sev-low", TRIAGED: "text-sev-medium",
  ACCEPTED: "text-accent", PAID: "text-accent", REJECTED: "text-sev-critical",
  DUPLICATE: "text-secondary",
};

export function StatusChip({ status }: { status: ReportStatus }) {
  return <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-medium capitalize", colors[status])}><span className="h-1.5 w-1.5 rounded-full bg-current" />{status.toLowerCase()}</span>;
}
