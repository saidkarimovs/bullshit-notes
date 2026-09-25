"use client";

import { ParentSize } from "@visx/responsive";
import { Pie } from "@visx/shape";
import type { SeverityCount } from "@/types/api";
import { useChartColors } from "./chart-colors";

export function SeverityDonut({ data }: { data: SeverityCount[] }) {
  const colors = useChartColors();
  const total = data.reduce((sum, item) => sum + item.count, 0);
  return <div className="h-[228px] w-full"><ParentSize>{({ width, height }) => {
    const radius = Math.min(width * .38, height * .43);
    return <svg width={width} height={height} role="img" aria-label="Severity distribution">
      <g transform={"translate(" + width / 2 + "," + height / 2 + ")"}>
        {total > 0 ? <Pie data={data} pieValue={item => item.count} innerRadius={radius * .7} outerRadius={radius} padAngle={.018}>{pie => pie.arcs.map(arc => <path key={arc.data.severity} d={pie.path(arc) ?? ""} fill={colors.severity[arc.data.severity]}><title>{arc.data.severity}: {arc.data.count}</title></path>)}</Pie> : <circle r={radius} fill="none" stroke={colors.border} strokeWidth={radius * .3} />}
        <text textAnchor="middle" y="-2" fill={colors.primary} fontSize="28" fontFamily="var(--font-mono)">{total}</text>
        <text textAnchor="middle" y="18" fill={colors.muted} fontSize="11">total findings</text>
      </g>
    </svg>;
  }}</ParentSize></div>;
}
