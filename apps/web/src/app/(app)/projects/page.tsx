"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Crosshair, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api-client";
import { qk } from "@/lib/query-keys";
import { demoMode, formatMoney } from "@/lib/utils";
import { readDemo, upsertDemo } from "@/lib/demo-store";
import type { Project, ProjectType } from "@/types/api";

const typeLabels: Record<ProjectType, string> = { BOUNTY_PROGRAM: "Bug bounty", PENTEST_CLIENT: "Pentest", PERSONAL_RESEARCH: "Research" };

export default function ProjectsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [newType, setNewType] = useState<ProjectType>("BOUNTY_PROGRAM");
  useEffect(() => { if (new URLSearchParams(window.location.search).has("new")) { setCreating(true); window.history.replaceState(null, "", "/projects"); } }, []);
  const projects = useQuery({ queryKey: qk.projects.list({}), queryFn: () => demoMode ? Promise.resolve(readDemo<Project>("projects")) : api.get<Project[]>("/api/projects") });
  const filtered = (projects.data ?? []).filter(project => (!search || project.name.toLowerCase().includes(search.toLowerCase())) && (!type || project.type === type));
  async function createProject() {
    if (!name.trim()) return;
    const item: Project = { id: crypto.randomUUID(), name: name.trim(), type: newType, status: "ACTIVE", reportCount: 0, assetCount: 0, totalEarned: "0" };
    try {
      const saved = demoMode ? upsertDemo<Project>("projects", item) : await api.post<Project>("/api/projects", item);
      queryClient.setQueryData<Project[]>(qk.projects.list({}), old => [saved, ...(old ?? [])]);
      setCreating(false); setName(""); toast.success("Project created");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not create project"); }
  }
  return <main className="page"><PageHeader title="Projects" description="Targets, programs, and research engagements in one view." actions={<Button variant="primary" onClick={() => setCreating(true)}><Plus size={15} /> New project</Button>} />
    <div className="mb-4 flex flex-wrap gap-2"><div className="relative min-w-56 flex-1"><Search size={15} className="absolute left-3 top-2.5 text-muted" /><Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search projects..." className="pl-9" /></div><Select aria-label="Filter project type" value={type} onChange={event => setType(event.target.value)}><option value="">All types</option>{Object.entries(typeLabels).map(([key,value]) => <option key={key} value={key}>{value}</option>)}</Select></div>
    {projects.isLoading ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({length:6},(_,i) => <div key={i} className="panel h-48 animate-pulse" />)}</div> : projects.isError ? <div className="panel p-8 text-center text-sev-critical">Projects could not be loaded. <button className="underline" onClick={() => projects.refetch()}>Retry</button></div> : filtered.length === 0 ? <div className="panel p-10 text-center"><Crosshair size={24} className="mx-auto mb-3 text-muted" /><p>No projects found.</p><Button className="mt-3" onClick={() => setCreating(true)}>Create project</Button></div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map(project => <Link key={project.id} href={"/projects/" + project.id} className="panel group p-5 transition-colors hover:border-strong"><div className="flex items-start justify-between gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-md border border-accent/25 bg-accent/10 text-accent"><Crosshair size={19} strokeWidth={1.5} /></div><span className={"flex items-center gap-1.5 text-[11px] " + (project.status === "ACTIVE" ? "text-accent" : "text-muted")}><span className="h-1.5 w-1.5 rounded-full bg-current" />{project.status.toLowerCase()}</span></div><h2 className="mt-4 text-base font-semibold group-hover:text-accent">{project.name}</h2><p className="mt-1 line-clamp-2 h-10 text-secondary">{project.description ?? "A research workspace for this target."}</p><div className="mt-3 flex items-center gap-2 text-[10px] uppercase tracking-wide text-muted"><span className="rounded border border-subtle px-1.5 py-0.5">{typeLabels[project.type]}</span><span>{project.platform}</span></div><div className="mt-5 grid grid-cols-3 gap-2 border-t border-subtle pt-4 text-[11px] text-muted"><div><strong className="mono block text-base text-primary">{project.reportCount}</strong>Reports</div><div><strong className="mono block text-base text-primary">{project.assetCount}</strong>Assets</div><div><strong className="mono block text-base text-primary">{formatMoney(project.totalEarned)}</strong>Earned</div></div></Link>)}</div>}
    {creating && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onMouseDown={event => { if (event.target === event.currentTarget) setCreating(false); }}><div role="dialog" aria-modal="true" aria-label="New project" className="panel w-full max-w-md p-6"><h2 className="text-lg font-semibold">New project</h2><p className="mt-1 text-secondary">Create a workspace for a target or engagement.</p><label className="mt-5 block"><span className="mb-1 block text-secondary">Project name</span><Input autoFocus value={name} onChange={event => setName(event.target.value)} onKeyDown={event => { if (event.key === "Enter") void createProject(); }} placeholder="e.g. Acme Cloud" /></label><label className="mt-4 block"><span className="mb-1 block text-secondary">Type</span><Select className="w-full" value={newType} onChange={event => setNewType(event.target.value as ProjectType)}>{Object.entries(typeLabels).map(([key,value]) => <option key={key} value={key}>{value}</option>)}</Select></label><div className="mt-6 flex justify-end gap-2"><Button onClick={() => setCreating(false)}>Cancel</Button><Button variant="primary" disabled={!name.trim()} onClick={() => void createProject()}>Create project</Button></div></div></div>}
  </main>;
}

