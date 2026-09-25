"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileWarning, Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column, type TableSort } from "@/components/shared/data-table";
import { SeverityBadge } from "@/components/shared/severity-badge";
import { StatusChip } from "@/components/shared/status-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api-client";
import { qk } from "@/lib/query-keys";
import { demoMode, formatMoney } from "@/lib/utils";
import { readDemo } from "@/lib/demo-store";
import { demoProjects } from "@/lib/demo-data";
import type { Report } from "@/types/api";

export default function ReportsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState<TableSort>({ key: "updatedAt", direction: "desc" });
  const reports = useQuery({ queryKey: qk.reports.list({}), queryFn: () => demoMode ? Promise.resolve(readDemo<Report>("reports")) : api.get<Report[]>("/api/reports") });
  const filtered = useMemo(() => (reports.data ?? []).filter(report =>
    (!search || [report.title, report.target].some(value => value.toLowerCase().includes(search.toLowerCase()))) &&
    (!severity || report.severity === severity) && (!status || report.status === status)
  ).sort((a,b) => {
    const one = String(a[sort.key as keyof Report] ?? ""), two = String(b[sort.key as keyof Report] ?? "");
    return one.localeCompare(two) * (sort.direction === "asc" ? 1 : -1);
  }), [reports.data, search, severity, status, sort]);
  const columns: Column<Report>[] = [
    { key: "severity", header: "Severity", cell: row => <SeverityBadge severity={row.severity} size="sm" />, sortable: true },
    { key: "title", header: "Finding", cell: row => <span className="font-medium">{row.title}</span>, sortable: true },
    { key: "type", header: "Type", cell: row => <span className="text-secondary">{row.type}</span>, sortable: true },
    { key: "target", header: "Target", cell: row => <span className="mono text-[11px] text-secondary">{row.target}</span>, sortable: true },
    { key: "status", header: "Status", cell: row => <StatusChip status={row.status} />, sortable: true },
    { key: "cvssScore", header: "CVSS", cell: row => <span className="mono">{row.cvssScore?.toFixed(1) ?? "—"}</span>, sortable: true },
    { key: "bountyAmount", header: "Bounty", cell: row => <span className="mono">{formatMoney(row.bountyAmount)}</span>, sortable: true },
    { key: "updatedAt", header: "Updated", cell: row => <span className="text-secondary">{new Date(row.updatedAt).toLocaleDateString()}</span>, sortable: true },
  ];
  return <main className="page"><PageHeader title="Reports" description="Track findings from draft through disclosure and payment." actions={<Link href="/reports/new"><Button variant="primary"><Plus size={15} /> New report</Button></Link>} />
    <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_160px_160px]"><div className="relative"><Search size={15} className="absolute left-3 top-2.5 text-muted" /><Input aria-label="Search reports" placeholder="Search findings or targets..." className="pl-9" value={search} onChange={event => setSearch(event.target.value)} /></div><Select aria-label="Filter severity" value={severity} onChange={event => setSeverity(event.target.value)}><option value="">All severities</option>{["CRITICAL","HIGH","MEDIUM","LOW","INFO"].map(level => <option key={level}>{level}</option>)}</Select><Select aria-label="Filter status" value={status} onChange={event => setStatus(event.target.value)}><option value="">All statuses</option>{["DRAFT","SUBMITTED","TRIAGED","ACCEPTED","PAID","REJECTED","DUPLICATE"].map(value => <option key={value}>{value}</option>)}</Select></div>
    {reports.isError && <div className="panel mb-4 flex items-center justify-between p-4 text-sev-critical"><span>Reports could not be loaded.</span><Button onClick={() => reports.refetch()}>Retry</Button></div>}
    <DataTable columns={columns} data={filtered} isLoading={reports.isLoading} onRowClick={row => router.push("/reports/" + row.id)} sort={sort} onSortChange={setSort} emptyTitle="No reports found" />
    <p className="mt-3 text-[11px] text-muted">{filtered.length} reports across {demoProjects.length} projects</p>
  </main>;
}
