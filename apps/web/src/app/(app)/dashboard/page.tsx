"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowDownRight, ArrowUpRight, Crosshair, DollarSign, FileWarning, ShieldAlert } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { PageHeader } from "@/components/shared/page-header";
import { SeverityDonut } from "@/components/charts/severity-donut";
import { FindingsArea } from "@/components/charts/findings-area";
import { StatusFunnel } from "@/components/charts/status-funnel";
import { EarningsLine } from "@/components/charts/earnings-line";
import { ActivityHeatmap } from "@/components/charts/activity-heatmap";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { qk } from "@/lib/query-keys";
import { demoMode, formatMoney } from "@/lib/utils";
import { demoActivity, demoEarnings, demoFindings, demoFunnel, demoHeatmap, demoOverview, demoSeverity, demoVdp } from "@/lib/demo-data";
import type { ActivityItem, DashboardOverview, EarningsPoint, FindingsPoint, FunnelPoint, HeatmapPoint, SeverityCount, VdpPipelineItem } from "@/types/api";

type Range = "7d" | "30d" | "90d" | "1y";
const ranges: Range[] = ["7d", "30d", "90d", "1y"];
const rangeDays: Record<Range, number> = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 };

function Card({ title, children, className = "", right }: { title: string; children: React.ReactNode; className?: string; right?: React.ReactNode }) {
  return <section className={"panel min-w-0 p-5 " + className}><div className="mb-4 flex items-center justify-between gap-3"><h2 className="font-medium">{title}</h2>{right}</div>{children}</section>;
}
function Metric({ label, value, trend, icon: Icon, loading }: { label: string; value: string; trend: number; icon: typeof FileWarning; loading: boolean }) {
  return <div className="panel p-5"><div className="flex items-start justify-between"><span className="text-secondary">{label}</span><Icon size={17} strokeWidth={1.5} className="text-muted" /></div>{loading ? <Skeleton className="mt-5 h-9 w-24" /> : <div className="kpi-number mt-3">{value}</div>}<div className="mt-2 flex items-center gap-1.5 text-[11px]"><span className={trend >= 0 ? "flex items-center text-accent" : "flex items-center text-sev-high"}>{trend >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{Math.abs(trend)}%</span><span className="text-muted">vs previous period</span></div></div>;
}

export default function DashboardPage() {
  const [range, setRange] = useState<Range>("30d");
  const params = useMemo(() => {
    const to = new Date();
    const from = new Date(to.getTime() - rangeDays[range] * 86400000);
    return { bucket: range === "1y" ? "month" : "day", from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
  }, [range]);
  const overview = useQuery({ queryKey: qk.stats.overview(), queryFn: () => demoMode ? Promise.resolve(demoOverview) : api.get<DashboardOverview>("/api/stats/overview") });
  const severity = useQuery({ queryKey: qk.stats.severity(), queryFn: () => demoMode ? Promise.resolve(demoSeverity) : api.get<SeverityCount[]>("/api/stats/severity") });
  const findings = useQuery({ queryKey: qk.stats.overTime(params), queryFn: () => demoMode ? Promise.resolve(demoFindings.slice(-Math.min(rangeDays[range], 30))) : api.get<FindingsPoint[]>("/api/stats/findings-over-time?" + new URLSearchParams(params)) });
  const funnel = useQuery({ queryKey: qk.stats.funnel(), queryFn: () => demoMode ? Promise.resolve(demoFunnel) : api.get<FunnelPoint[]>("/api/stats/status-funnel") });
  const earnings = useQuery({ queryKey: qk.stats.earnings({ range }), queryFn: () => demoMode ? Promise.resolve(demoEarnings) : api.get<EarningsPoint[]>("/api/stats/earnings?bucket=month") });
  const heatmap = useQuery({ queryKey: qk.stats.heatmap(365), queryFn: () => demoMode ? Promise.resolve(demoHeatmap) : api.get<HeatmapPoint[]>("/api/stats/activity-heatmap?days=365") });
  const vdp = useQuery({ queryKey: qk.vdp.pipeline(), queryFn: () => demoMode ? Promise.resolve(demoVdp) : api.get<VdpPipelineItem[]>("/api/vdp/pipeline") });
  const activity = useQuery({ queryKey: qk.timeline.list({ limit: 4 }), queryFn: () => demoMode ? Promise.resolve(demoActivity) : api.get<ActivityItem[]>("/api/audit?perPage=4") });
  const error = [overview, severity, findings, funnel, earnings, heatmap, vdp, activity].find(query => query.isError);
  const loading = overview.isLoading;
  const values = overview.data;
  return <main className="page">
    <PageHeader title="Dashboard" description="A clear view of your research, findings, and disclosure work." actions={<div className="flex rounded-md border border-subtle bg-surface p-0.5">{ranges.map(option => <button key={option} onClick={() => setRange(option)} className={"rounded px-2.5 py-1.5 text-[11px] uppercase transition-colors " + (range === option ? "bg-elevated text-primary" : "text-muted hover:text-primary")}>{option}</button>)}</div>} />
    {error && <div role="alert" className="panel mb-5 flex items-center justify-between border-sev-critical/40 p-4 text-sev-critical"><span>Some dashboard data could not be loaded.</span><Button size="sm" onClick={() => error.refetch()}>Retry</Button></div>}
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Total findings" value={String(values?.totalFindings ?? 0)} trend={values?.trends?.totalFindings ?? 0} icon={FileWarning} loading={loading} />
      <Metric label="Open findings" value={String(values?.openFindings ?? 0)} trend={values?.trends?.openFindings ?? 0} icon={Activity} loading={loading} />
      <Metric label="Active targets" value={String(values?.activeTargets ?? 0)} trend={values?.trends?.activeTargets ?? 0} icon={Crosshair} loading={loading} />
      <Metric label="Total earned" value={formatMoney(values?.totalEarned)} trend={values?.trends?.totalEarned ?? 0} icon={DollarSign} loading={loading} />
    </div>
    <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
      <Card title="Findings over time" className="xl:col-span-8" right={<span className="text-[11px] text-muted">By severity</span>}><FindingsArea data={findings.data ?? []} bucket={params.bucket} /><div className="mt-2 flex flex-wrap gap-3 text-[10px] uppercase tracking-wide text-muted">{(["CRITICAL","HIGH","MEDIUM","LOW","INFO"] as const).map(level => <span key={level} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--color-sev-" + level.toLowerCase() + ")" }} />{level}</span>)}</div></Card>
      <Card title="Severity distribution" className="xl:col-span-4"><SeverityDonut data={severity.data ?? []} /><div className="flex flex-wrap justify-center gap-x-4 gap-y-2">{severity.data?.map(item => <span key={item.severity} className="text-[11px] text-secondary">{item.severity.toLowerCase()} <b className="mono text-primary">{item.count}</b></span>)}</div></Card>
      <Card title="Status funnel" className="xl:col-span-5"><StatusFunnel data={funnel.data ?? []} /></Card>
      <Card title="Earnings" className="xl:col-span-7" right={<span className="text-[11px] text-muted">Monthly / cumulative</span>}><EarningsLine data={earnings.data ?? []} /><div className="mt-1 flex gap-4 text-[11px] text-secondary"><span><i className="mr-1 inline-block h-0.5 w-3 bg-accent align-middle" />Monthly</span><span><i className="mr-1 inline-block h-0.5 w-3 bg-border-strong align-middle" />Cumulative</span></div></Card>
      <Card title="Research activity" className="xl:col-span-12" right={<span className="text-[11px] text-muted">Last 365 days</span>}><ActivityHeatmap data={heatmap.data ?? []} /></Card>
      <Card title="Recent activity" className="xl:col-span-7"><div className="divide-y divide-[var(--color-border-subtle)]">{(activity.data ?? []).map(item => <div key={item.id} className="flex gap-3 py-3"><div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-elevated text-accent"><Activity size={14} strokeWidth={1.5} /></div><div className="min-w-0 flex-1"><p><span className="font-medium">{item.actor}</span> {item.action} {item.entityType} <span className="font-medium">{item.title}</span></p><span className="text-[11px] text-muted">{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</span></div></div>)}{!activity.isLoading && !activity.data?.length && <p className="py-10 text-center text-muted">No recent activity.</p>}</div></Card>
      <Card title="Disclosure watch" className="xl:col-span-5" right={<ShieldAlert size={16} className="text-muted" strokeWidth={1.5} />}><div className="divide-y divide-[var(--color-border-subtle)]">{(vdp.data ?? []).filter(item => item.daysRemaining <= 14).sort((a,b) => a.daysRemaining - b.daysRemaining).map(item => <div key={item.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate font-medium">{item.title}</p><p className="mt-0.5 text-[11px] text-muted">VDP disclosure deadline</p></div><span className={"mono shrink-0 text-[11px] " + (item.daysRemaining < 0 ? "text-sev-critical" : item.daysRemaining <= 7 ? "text-sev-medium" : "text-accent")}>{item.daysRemaining < 0 ? Math.abs(item.daysRemaining) + "d overdue" : item.daysRemaining + "d left"}</span></div>)}{!vdp.isLoading && !vdp.data?.length && <p className="py-10 text-center text-muted">No reports due soon.</p>}</div></Card>
    </div>
  </main>;
}

