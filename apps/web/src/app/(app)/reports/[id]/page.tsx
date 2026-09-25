"use client";

import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { SeverityBadge } from "@/components/shared/severity-badge";
import { StatusChip } from "@/components/shared/status-chip";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { MarkdownPreview } from "@/components/editor/markdown-preview";
import { MarkdownEditor } from "@/components/editor/markdown-editor";
import { api } from "@/lib/api-client";
import { qk } from "@/lib/query-keys";
import { demoMode, formatMoney } from "@/lib/utils";
import { readDemo, upsertDemo, deleteDemo } from "@/lib/demo-store";
import { demoProjects } from "@/lib/demo-data";
import { allowedTransitions } from "@/lib/report-status";
import type { Report, ReportStatus } from "@/types/api";
import { useRouter } from "next/navigation";

export default function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const report = useQuery({ queryKey: qk.reports.detail(id), queryFn: () => demoMode ? Promise.resolve(readDemo<Report>("reports").find(item => item.id === id) ?? null) : api.get<Report>("/api/reports/" + id) });
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState<string | null>(null);
  const current = report.data;
  const save = useMutation({ mutationFn: async (patch: Partial<Report>) => {
    if (!current) throw new Error("Report not found");
    if (demoMode) return upsertDemo<Report>("reports", { ...current, ...patch, updatedAt: new Date().toISOString() });
    return api.patch<Report>("/api/reports/" + id, patch);
  }, onSuccess: updated => { queryClient.setQueryData(qk.reports.detail(id), updated); queryClient.invalidateQueries({ queryKey: ["reports"] }); toast.success("Report saved"); }, onError: error => toast.error(error.message) });
  const changeStatus = useMutation({ mutationFn: async (toStatus: ReportStatus) => {
    if (!current) throw new Error("Report not found");
    if (!allowedTransitions[current.status].includes(toStatus)) throw new Error("Invalid status transition");
    if (demoMode) return upsertDemo<Report>("reports", { ...current, status: toStatus, updatedAt: new Date().toISOString() });
    await api.post("/api/reports/" + id + "/status", { toStatus });
    return api.get<Report>("/api/reports/" + id);
  }, onSuccess: updated => { queryClient.setQueryData(qk.reports.detail(id), updated); queryClient.invalidateQueries({ queryKey: ["reports"] }); toast.success("Status updated"); }, onError: error => toast.error(error.message) });
  if (report.isLoading) return <main className="page"><div className="panel h-64 animate-pulse" /></main>;
  if (!current) return <main className="page"><p>Report not found.</p><Link href="/reports" className="text-accent">Back to reports</Link></main>;
  const project = demoProjects.find(item => item.id === current.projectId);
  return <main className="page"><Link href="/reports" className="mb-4 inline-flex items-center gap-2 text-secondary hover:text-primary"><ArrowLeft size={15} /> Reports</Link><PageHeader title={current.title} description={current.target} actions={<><Button size="sm" onClick={() => setEditing(!editing)}>{editing ? "Preview" : "Edit report"}</Button>{demoMode && <Button size="sm" variant="ghost" title="Duplicate report" onClick={() => { const duplicate = upsertDemo<Report>("reports", { ...current, id: crypto.randomUUID(), title: current.title + " (copy)", status: "DRAFT", updatedAt: new Date().toISOString() }); router.push("/reports/" + duplicate.id); }}><Copy size={15} /></Button>}{demoMode && <Button size="sm" variant="danger" title="Delete report" onClick={() => { if (confirm("Delete this report?")) { deleteDemo("reports", id); router.push("/reports"); } }}><Trash2 size={15} /></Button>}</>} />
    <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(270px,1fr)]"><section className="panel min-h-[540px] p-6">{editing ? <><MarkdownEditor value={body ?? current.body ?? ""} onChange={setBody} onSave={() => { save.mutate({ body: body ?? current.body ?? "" }); setEditing(false); }} /><div className="mt-4"><Button variant="primary" onClick={() => { save.mutate({ body: body ?? current.body ?? "" }); setEditing(false); }}>Save changes</Button></div></> : <MarkdownPreview source={current.body ?? "No report body yet."} />}</section><aside className="panel h-fit p-5"><h2 className="mb-4 font-medium">Report details</h2><div className="space-y-4"><Detail label="Status"><StatusChip status={current.status} />{allowedTransitions[current.status].length > 0 && <Select aria-label="Change status" className="mt-2 w-full" value="" onChange={event => changeStatus.mutate(event.target.value as ReportStatus)}><option value="">Move to...</option>{allowedTransitions[current.status].map(next => <option key={next}>{next}</option>)}</Select>}</Detail><Detail label="Severity"><SeverityBadge severity={current.severity} score={current.cvssScore} /></Detail><Detail label="Type">{current.type}</Detail><Detail label="Project">{project?.name ?? current.projectId}</Detail><Detail label="Bounty">{formatMoney(current.bountyAmount)}</Detail><Detail label="Updated">{new Date(current.updatedAt).toLocaleString()}</Detail></div></aside></div>
  </main>;
}
function Detail({ label, children }: { label: string; children: React.ReactNode }) { return <div className="border-b border-subtle pb-3 last:border-0"><div className="mb-1.5 text-[11px] uppercase tracking-wide text-muted">{label}</div>{children}</div>; }
