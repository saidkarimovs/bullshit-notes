"use client";

import { ParentSize } from "@visx/responsive";
import { Bar } from "@visx/shape";
import type { FunnelPoint } from "@/types/api";
import { useChartColors } from "./chart-colors";

export function StatusFunnel({ data }: { data: FunnelPoint[] }) {
  const colors = useChartColors();
  return <div className="h-[230px] w-full"><ParentSize>{({ width, height }) => {
    const max = Math.max(1, ...data.map(item => item.count));
    const row = Math.min(40, (height - 8) / Math.max(1, data.length));
    return <svg width={width} height={height} role="img" aria-label="Report status funnel">
      {data.length === 0 && <text x={width / 2} y={height / 2} textAnchor="middle" fill={colors.muted}>No data in this range</text>}
      {data.map((item, index) => {
        const x = 84, y = index * row + 8, barWidth = Math.max(0, width - 158);
        return <g key={item.status}><text x="0" y={y + 14} fill={colors.muted} fontSize="11">{item.status}</text><Bar x={x} y={y + 2} width={barWidth} height={14} rx={3} fill={colors.border} opacity=".6" /><Bar x={x} y={y + 2} width={barWidth * item.count / max} height={14} rx={3} fill={colors.accent} opacity={1 - index * .11} /><text x={x + barWidth + 8} y={y + 14} fill={colors.primary} fontSize="11" fontFamily="var(--font-mono)">{item.count}</text>{index > 0 && <text x={x} y={y + 29} fill={colors.muted} fontSize="9">−{item.dropOffPct}% from previous stage</text>}</g>;
      })}
    </svg>;
  }}</ParentSize></div>;
}
