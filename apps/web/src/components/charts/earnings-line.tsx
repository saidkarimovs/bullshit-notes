"use client";

import { ParentSize } from "@visx/responsive";
import { scaleLinear, scaleTime } from "@visx/scale";
import { LinePath } from "@visx/shape";
import type { EarningsPoint } from "@/types/api";
import { useChartColors } from "./chart-colors";

export function EarningsLine({ data }: { data: EarningsPoint[] }) {
  const colors = useChartColors();
  return <div className="h-[230px] w-full"><ParentSize>{({ width, height }) => {
    const left = 38, right = width - 10, top = 12, bottom = height - 26;
    const amounts = data.map(point => Number.parseFloat(point.amount) || 0);
    const cumulative = data.map(point => Number.parseFloat(point.cumulative) || 0);
    const x = scaleTime({ domain: [new Date(data[0]?.date ?? Date.now()), new Date(data[data.length - 1]?.date ?? Date.now() + 86400000)], range: [left, right] });
    const yAmount = scaleLinear({ domain: [0, Math.max(1, ...amounts) * 1.12], range: [bottom, top] });
    const yTotal = scaleLinear({ domain: [0, Math.max(1, ...cumulative) * 1.12], range: [bottom, top] });
    return <svg width={width} height={height} role="img" aria-label="Monthly and cumulative earnings">
      {[0, .5, 1].map(step => <g key={step}><line x1={left} x2={right} y1={yAmount(Math.max(1, ...amounts) * step)} y2={yAmount(Math.max(1, ...amounts) * step)} stroke={colors.border} opacity=".55" /><text x={left - 5} y={yAmount(Math.max(1, ...amounts) * step) + 3} textAnchor="end" fill={colors.muted} fontSize="10">{Math.round(Math.max(1, ...amounts) * step / 1000)}k</text></g>)}
      {data.length === 0 ? <text x={width / 2} y={height / 2} textAnchor="middle" fill={colors.muted}>No data in this range</text> : <>
        <LinePath data={data} x={point => x(new Date(point.date)) ?? 0} y={point => yAmount(Number.parseFloat(point.amount) || 0)} stroke={colors.accent} strokeWidth={2.5} />
        <LinePath data={data} x={point => x(new Date(point.date)) ?? 0} y={point => yTotal(Number.parseFloat(point.cumulative) || 0)} stroke={colors.muted} strokeWidth={1.5} strokeDasharray="4 4" />
      </>}
      {data.length > 1 && <><text x={left} y={height - 5} fill={colors.muted} fontSize="10">{new Date(data[0].date).toLocaleString("en", { month: "short" })}</text><text x={right} y={height - 5} textAnchor="end" fill={colors.muted} fontSize="10">{new Date(data[data.length - 1].date).toLocaleString("en", { month: "short" })}</text></>}
    </svg>;
  }}</ParentSize></div>;
}
