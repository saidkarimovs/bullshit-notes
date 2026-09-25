"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Crosshair, FileWarning, Network, NotebookPen } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SeverityBadge } from "@/components/shared/severity-badge";
import { StatusChip } from "@/components/shared/status-chip";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { qk } from "@/lib/query-keys";
import { demoMode, formatMoney } from "@/lib/utils";
import { readDemo } from "@/lib/demo-store";
import { isHostInScope } from "@/lib/scope";
import type { Note, Project, Report } from "@/types/api";

type Tab = "Overview" | "Scope" | "Reports" | "Assets" | "Notes" | "Checklists" | "Activity";
const tabs: Tab[] = ["Overview","Scope","Reports","Assets","Notes","Checklists","Activity"];

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [tab, setTab] = useState<Tab>("Overview");
  const [host, setHost] = useState("");
  const [inScope, setInScope] = useState("*.example.com");
  const [outScope, setOutScope] = useState("");
  const project = useQuery({ queryKey: qk.projects.detail(id), queryFn: () => demoMode ? Promise.resolve(readDemo<Project>("projects").find(item => item.id === id) ?? null) : api.get<Project>("/api/projects/" + id) });
  const reports = useQuery({ queryKey: qk.reports.list({ projectId: id }), queryFn: () => demoMode ? Promise.resolve(readDemo<Report>("reports").filter(item => item.projectId === id)) : api.get<Report[]>("/api/reports?projectId=" + id) });
  const notes = useQuery({ queryKey: qk.notes.list({ projectId: id }), queryFn: () => demoMode ? Promise.resolve(readDemo<Note>("notes").filter(item => item.projectId === id)) : api.get<Note[]>("/api/notes?projectId=" + id) });
  if (project.isLoading) return <main className="page"><div className="panel h-60 animate-pulse" /></main>;
  if (!project.data) return <main className="page"><p>Project not found.</p><Link href="/projects" className="text-accent">Back to projects</Link></main>;
  const item = project.data;
  const scoped = host && isHostInScope(host, inScope.split("\n")) && !isHostInScope(host, outScope.split("\n"));
  return <main className="page"><Link href="/projects" className="mb-4 inline-flex items-center gap-2 text-secondary hover:text-primary"><ArrowLeft size={15} /> Projects</Link><PageHeader title={item.name} description={item.description ?? "Research workspace"} actions={<span className="flex items-center gap-1.5 rounded border border-accent/30 bg-accent/10 px-2 py-1 text-[11px] uppercase text-accent"><span className="h-1.5 w-1.5 rounded-full bg-current" />{item.status}</span>} />
    <div className="mb-4 flex gap-1 overflow-x-auto border-b border-subtle">{tabs.map(value => <button key={value} onClick={() => setTab(value)} className={"whitespace-nowrap border-b-2 px-3 py-2.5 text-[12px] " + (tab === value ? "border-accent text-primary" : "border-transparent text-secondary hover:text-primary")}>{value}</button>)}</div>
    {tab === "Overview" && <div className="grid gap-4 lg:grid-cols-3"><div className="panel p-5"><Crosshair size={18} className="text-accent" /><p className="mt-4 text-secondary">Reports</p><strong className="kpi-number">{item.reportCount}</strong></div><div className="panel p-5"><Network size={18} className="text-accent" /><p className="mt-4 text-secondary">Assets</p><strong className="kpi-number">{item.assetCount}</strong></div><div className="panel p-5"><FileWarning size={18} className="text-accent" /><p className="mt-4 text-secondary">Total earned</p><strong className="kpi-number">{formatMoney(item.totalEarned)}</strong></div><section className="panel p-5 lg:col-span-3"><h2 className="mb-4 font-medium">Recent findings</h2>{reports.data?.slice(0,4).map(report => <Link key={report.id} href={"/reports/" + report.id} className="flex items-center gap-3 border-t border-subtle py-3 hover:text-accent"><SeverityBadge severity={report.severity} size="sm" /><span className="flex-1">{report.title}</span><StatusChip status={report.status} /></Link>)}{!reports.data?.length && <p className="text-muted">No findings yet.</p>}</section></div>}
    {tab === "Scope" && <div className="grid gap-4 lg:grid-cols-2"><section className="panel p-5"><h2 className="mb-2 font-medium">In scope</h2><p className="mb-3 text-[11px] text-muted">One host or wildcard per line.</p><textarea value={inScope} onChange={event => setInScope(event.target.value)} className="mono h-40 w-full rounded-md border border-subtle bg-elevated p-3 outline-none focus:border-accent" /></section><section className="panel p-5"><h2 className="mb-2 font-medium">Out of scope</h2><p className="mb-3 text-[11px] text-muted">Explicit exclusions take precedence.</p><textarea value={outScope} onChange={event => setOutScope(event.target.value)} className="mono h-40 w-full rounded-md border border-subtle bg-elevated p-3 outline-none focus:border-accent" /></section><section className="panel p-5 lg:col-span-2"><h2 className="mb-3 font-medium">Check target</h2><div className="flex items-center gap-3"><Input className="mono max-w-md" placeholder="api.example.com" value={host} onChange={event => setHost(event.target.value)} />{host && <span className={scoped ? "text-accent" : "text-sev-critical"}>{scoped ? "In scope" : "Out of scope"}</span>}</div><p className="mt-2 text-[11px] text-muted">Scope changes here are local to this view in the current frontend slice.</p></section></div>}
    {tab === "Reports" && <div className="panel p-5"><h2 className="mb-4 font-medium">Linked reports</h2>{reports.data?.map(report => <Link key={report.id} href={"/reports/" + report.id} className="flex items-center gap-3 border-t border-subtle py-3 hover:text-accent"><SeverityBadge severity={report.severity} size="sm" />{report.title}<span className="ml-auto"><StatusChip status={report.status} /></span></Link>)}{!reports.data?.length && <p className="text-muted">No linked reports.</p>}<Link href="/reports/new"><Button className="mt-4">Create report</Button></Link></div>}
    {tab === "Notes" && <div className="panel p-5"><h2 className="mb-4 font-medium">Linked notes</h2>{notes.data?.map(note => <div key={note.id} className="flex items-center gap-2 border-t border-subtle py-3"><NotebookPen size={15} className="text-muted" />{note.title}</div>)}{!notes.data?.length && <p className="text-muted">No linked notes.</p>}<Link href="/notes"><Button className="mt-4">Open notes</Button></Link></div>}
    {["Assets","Checklists","Activity"].includes(tab) && <div className="panel p-8 text-center"><h2 className="font-medium">{tab}</h2><p className="mt-2 text-secondary">This project view will connect to the {tab.toLowerCase()} module when that endpoint is available.</p></div>}
  </main>;
}
