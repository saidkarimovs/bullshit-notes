"use client";

import { ParentSize } from "@visx/responsive";
import type { HeatmapPoint } from "@/types/api";
import { useChartColors } from "./chart-colors";

export function ActivityHeatmap({ data }: { data: HeatmapPoint[] }) {
  const colors = useChartColors();
  return <div className="h-[138px] w-full"><ParentSize>{({ width, height }) => {
    const gap = 3, left = 27, top = 18, cell = Math.max(5, Math.min(14, (width - left - 14) / 53 - gap));
    const max = Math.max(1, ...data.map(item => item.count));
    return <svg width={width} height={height} role="img" aria-label="Research activity in the last year">
      {["M", "W", "F"].map((day, index) => <text key={day} x="0" y={top + (index * 2 + 1) * (cell + gap) + 8} fill={colors.muted} fontSize="10">{day}</text>)}
      {data.length === 0 && <text x={width / 2} y={height / 2} textAnchor="middle" fill={colors.muted}>No data in this range</text>}
      {data.map((item, index) => {
        const week = Math.floor(index / 7), day = index % 7, opacity = item.count === 0 ? .45 : .2 + Math.ceil(item.count / max * 4) * .2;
        return <rect key={item.date} x={left + week * (cell + gap)} y={top + day * (cell + gap)} width={cell} height={cell} rx="2" fill={item.count ? colors.accent : colors.border} opacity={opacity}><title>{item.date}: {item.count} activities</title></rect>;
      })}
    </svg>;
  }}</ParentSize></div>;
}
