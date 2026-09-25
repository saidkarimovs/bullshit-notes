"use client";

import { ParentSize } from "@visx/responsive";
import { scaleLinear, scaleTime } from "@visx/scale";
import { LinePath } from "@visx/shape";
import type { FindingsPoint, Severity } from "@/types/api";
import { useChartColors } from "./chart-colors";

const keys: Severity[] = ["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"];
export function FindingsArea({ data, bucket = "day" }: { data: FindingsPoint[]; bucket?: string }) {
  const colors = useChartColors();
  return <div className="h-[245px] w-full"><ParentSize>{({ width, height }) => {
    const left = 32, right = width - 10, top = 14, bottom = height - 25;
    const max = Math.max(1, ...data.map(point => keys.reduce((sum, key) => sum + point[key], 0)));
    const x = scaleTime({ domain: [new Date(data[0]?.date ?? Date.now()), new Date(data[data.length - 1]?.date ?? Date.now() + 86400000)], range: [left, right] });
    const y = scaleLinear({ domain: [0, max * 1.12], range: [bottom, top] });
    const cumulative = keys.map((key, index) => data.map(point => ({ date: point.date, value: keys.slice(0, index + 1).reduce((sum, part) => sum + point[part], 0) })));
    return <svg width={width} height={height} role="img" aria-label={"Findings over time by " + bucket}>
      {[0, .25, .5, .75, 1].map(step => <g key={step}><line x1={left} x2={right} y1={y(max * step)} y2={y(max * step)} stroke={colors.border} opacity=".55" /><text x={left - 7} y={y(max * step) + 3} fill={colors.muted} textAnchor="end" fontSize="10">{Math.round(max * step)}</text></g>)}
      {data.length === 0 ? <text x={width / 2} y={height / 2} fill={colors.muted} textAnchor="middle">No data in this range</text> : cumulative.map((series, index) => <LinePath key={keys[index]} data={series} x={point => x(new Date(point.date)) ?? 0} y={point => y(point.value)} stroke={colors.severity[keys[index]]} strokeWidth={2} curve={undefined} />)}
      {data.length > 1 && <><text x={left} y={height - 5} fill={colors.muted} fontSize="10">{data[0].date.slice(5)}</text><text x={right} y={height - 5} textAnchor="end" fill={colors.muted} fontSize="10">{data[data.length - 1].date.slice(5)}</text></>}
    </svg>;
  }}</ParentSize></div>;
}
