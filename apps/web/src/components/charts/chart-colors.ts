"use client";

import { useEffect, useState } from "react";
import type { Severity } from "@/types/api";

type ChartColors = { accent: string; muted: string; border: string; primary: string; severity: Record<Severity, string> };
const fallback: ChartColors = { accent: "#6bd38c", muted: "#858893", border: "#41434c", primary: "#f2f2f3", severity: { CRITICAL: "#c74b56", HIGH: "#d08745", MEDIUM: "#c2ad54", LOW: "#64a9cc", INFO: "#81848d" } };

export function useChartColors() {
  const [colors, setColors] = useState(fallback);
  useEffect(() => {
    const update = () => {
      const css = getComputedStyle(document.documentElement);
      const read = (name: string) => css.getPropertyValue("--color-" + name).trim();
      setColors({
        accent: read("accent"), muted: read("text-muted"), border: read("border-subtle"), primary: read("text-primary"),
        severity: { CRITICAL: read("sev-critical"), HIGH: read("sev-high"), MEDIUM: read("sev-medium"), LOW: read("sev-low"), INFO: read("sev-info") },
      });
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);
  return colors;
}
