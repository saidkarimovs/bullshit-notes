"use client";

import { useEffect } from "react";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { CommandPalette } from "@/components/shell/command-palette";
import { useUiStore } from "@/stores/ui-store";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const collapsed = useUiStore(state => state.sidebarCollapsed);
  const theme = useUiStore(state => state.theme);
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  return <div className="app-grid" style={{ "--sidebar-width": collapsed ? "56px" : "240px" } as React.CSSProperties}><Sidebar /><div className="app-main"><Topbar />{children}</div><CommandPalette /></div>;
}
