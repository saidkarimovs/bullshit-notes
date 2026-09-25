"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, ChevronsUpDown, LogOut, Moon, Sun } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { navigation } from "@/lib/navigation";
import { useUiStore } from "@/stores/ui-store";
import { cn, demoMode } from "@/lib/utils";
import { setAccessToken } from "@/lib/api-client";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const collapsed = useUiStore(state => state.sidebarCollapsed);
  const toggle = useUiStore(state => state.toggleSidebar);
  const theme = useUiStore(state => state.theme);
  const setTheme = useUiStore(state => state.setTheme);
  return <aside className="sticky top-0 z-20 flex h-screen flex-col border-r border-subtle bg-surface">
    <div className="flex h-16 items-center justify-between border-b border-subtle px-4">
      <Link href="/dashboard" aria-label="SkyVision dashboard" className="flex items-center gap-2.5 overflow-hidden">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-accent/40 bg-accent/10 text-accent"><span className="mono text-base font-bold">S</span></span>
        {!collapsed && <span className="mono text-[15px] font-semibold tracking-[-.06em]">skyvision<span className="text-accent">.</span></span>}
      </Link>
      <button type="button" onClick={toggle} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} className="text-muted hover:text-primary">{collapsed ? <ChevronRight size={16} strokeWidth={1.5} /> : <ChevronLeft size={16} strokeWidth={1.5} />}</button>
    </div>
    <nav className="min-h-0 flex-1 overflow-y-auto py-4">
      {navigation.map(section => <div key={section.group} className="mb-5">
        {!collapsed && <div className="mb-1.5 px-5 text-[10px] font-medium uppercase tracking-[.12em] text-muted">{section.group}</div>}
        <div className="space-y-0.5 px-2">
          {section.items.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return <Link key={item.href} href={item.href} title={collapsed ? item.label : undefined} className={cn("relative flex h-9 items-center gap-3 rounded-md px-3 transition-colors", active ? "bg-elevated text-primary" : "text-secondary hover:bg-elevated hover:text-primary", collapsed && "justify-center px-0")}>
              {active && <span className="absolute -left-2 top-1 bottom-1 w-0.5 rounded bg-accent" />}
              <item.icon size={18} strokeWidth={1.5} className="shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>;
          })}
        </div>
      </div>)}
    </nav>
    <div className="border-t border-subtle p-2">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild><button className={cn("flex w-full items-center gap-2 rounded-md p-2 text-left hover:bg-elevated", collapsed && "justify-center")}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent mono">SV</span>
          {!collapsed && <><span className="min-w-0 flex-1"><span className="block truncate font-medium">{demoMode ? "Demo researcher" : "My account"}</span><span className="text-[11px] text-muted">{demoMode ? "Preview workspace" : "Researcher"}</span></span><ChevronsUpDown size={14} className="text-muted" /></>}
        </button></DropdownMenu.Trigger>
        <DropdownMenu.Portal><DropdownMenu.Content side="right" align="end" sideOffset={8} className="z-50 min-w-44 rounded-lg border border-subtle bg-elevated p-1 text-primary">
          <DropdownMenu.Item onSelect={() => { setTheme(theme === "dark" ? "light" : "dark"); document.documentElement.dataset.theme = theme === "dark" ? "light" : "dark"; }} className="flex cursor-pointer items-center gap-2 rounded px-3 py-2 outline-none hover:bg-surface">{theme === "dark" ? <Sun size={16} /> : <Moon size={16} />} {theme === "dark" ? "Light theme" : "Dark theme"}</DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => { setAccessToken(null); router.push("/login"); }} className="flex cursor-pointer items-center gap-2 rounded px-3 py-2 outline-none hover:bg-surface"><LogOut size={16} /> Sign out</DropdownMenu.Item>
        </DropdownMenu.Content></DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  </aside>;
}
