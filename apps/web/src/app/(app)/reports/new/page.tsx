"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { MarkdownEditor } from "@/components/editor/markdown-editor";
import { demoMode } from "@/lib/utils";
import { upsertDemo } from "@/lib/demo-store";
import { api } from "@/lib/api-client";
import { qk } from "@/lib/query-keys";
import { demoProjects } from "@/lib/demo-data";
import type { Project, Report, ReportType, Severity } from "@/types/api";

const templates: Record<ReportType, string> = {
  CVE: "# Summary\n\n## Affected versions\n\n## Technical details\n\n## Proof of concept\n\n## Impact\n\n## Remediation\n",
  BBP: "# Summary\n\n## Steps to reproduce\n\n1. \n\n## Impact\n\n## Evidence\n",
  VDP: "# Summary\n\n## Affected service\n\n## Steps to reproduce\n\n## Impact\n\n## Coordinated disclosure timeline\n",
  PENTEST: "# Finding\n\n## Description\n\n## Risk\n\n## Evidence\n\n## Recommendation\n",
  INTERNAL: "# Finding\n\n## Context\n\n## Impact\n\n## Next steps\n",
};

export default function NewReportPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [type, setType] = useState<ReportType>("BBP");
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [severity, setSeverity] = useState<Severity>("MEDIUM");
  const [projectId, setProjectId] = useState("");
  const [body, setBody] = useState(templates.BBP);
  const projects = useQuery({
    queryKey: qk.projects.list({}),
    queryFn: () => (demoMode ? Promise.resolve(demoProjects) : api.get<Project[]>("/api/projects")),
  });
  const projectOptions = projects.data ?? [];
  const selectedProjectId = projectId || projectOptions[0]?.id || "";
  const create = useMutation({ mutationFn: async () => {
    const record: Report = { id: crypto.randomUUID(), title: title.trim(), target: target.trim(), type, severity, status: "DRAFT", projectId: selectedProjectId, updatedAt: new Date().toISOString(), body };
    if (demoMode) return upsertDemo<Report>("reports", record);
    return api.post<Report>("/api/reports", record);
  }, onSuccess: record => { queryClient.invalidateQueries({ queryKey: ["reports"] }); toast.success("Draft created"); router.push("/reports/" + record.id); }, onError: error => toast.error(error.message) });
  return <main className="page"><PageHeader title="New report" description="Create a clear finding record before submission." /><div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_280px]"><div className="panel p-5"><div className="mb-4 grid gap-3 sm:grid-cols-2"><label className="block"><span className="mb-1 block text-secondary">Title</span><Input value={title} onChange={event => setTitle(event.target.value)} placeholder="What did you find?" /></label><label className="block"><span className="mb-1 block text-secondary">Target</span><Input value={target} onChange={event => setTarget(event.target.value)} placeholder="api.example.com" /></label></div><MarkdownEditor value={body} onChange={setBody} onSave={() => create.mutate()} /><div className="mt-4 flex justify-end"><Button variant="primary" disabled={!title.trim() || create.isPending} onClick={() => create.mutate()}>{create.isPending ? "Saving..." : "Create draft"}</Button></div></div><aside className="panel h-fit space-y-4 p-5"><h2 className="font-medium">Classification</h2><label className="block"><span className="mb-1 block text-secondary">Report type</span><Select value={type} onChange={event => { const next = event.target.value as ReportType; setType(next); setBody(templates[next]); }} className="w-full">{(["CVE","BBP","VDP","PENTEST","INTERNAL"] as const).map(value => <option key={value}>{value}</option>)}</Select></label><label className="block"><span className="mb-1 block text-secondary">Severity</span><Select value={severity} onChange={event => setSeverity(event.target.value as Severity)} className="w-full">{(["INFO","LOW","MEDIUM","HIGH","CRITICAL"] as const).map(value => <option key={value}>{value}</option>)}</Select></label><label className="block"><span className="mb-1 block text-secondary">Project</span><Select value={selectedProjectId} onChange={event => setProjectId(event.target.value)} className="w-full" disabled={projectOptions.length === 0}>{projectOptions.length === 0 ? <option value="">No projects yet</option> : projectOptions.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</Select></label></aside></div></main>;
}
