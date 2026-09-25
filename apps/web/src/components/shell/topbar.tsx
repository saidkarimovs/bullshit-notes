"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronDown, ChevronRight, Plus, Search } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/stores/ui-store";
import { flatNavigation } from "@/lib/navigation";
import { demoMode } from "@/lib/utils";

export function Topbar() {
  const pathname = usePathname();
  const openPalette = useUiStore(state => state.setPaletteOpen);
  const current = flatNavigation.find(item => pathname === item.href || pathname.startsWith(item.href + "/"));
  return <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b border-subtle bg-base/95 px-8 backdrop-blur-sm max-[700px]:px-4">
    <div className="flex min-w-0 items-center gap-2 text-secondary"><span className="hidden sm:inline">Workspace</span><ChevronRight size={14} className="hidden sm:inline text-muted" /><span className="truncate font-medium text-primary">{current?.label ?? "Overview"}</span>{demoMode && <span className="ml-2 hidden rounded border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-accent md:inline">Demo</span>}</div>
    <div className="flex items-center gap-2">
      <button onClick={() => openPalette(true)} className="hidden h-9 w-64 items-center gap-2 rounded-md border border-subtle bg-surface px-3 text-muted hover:border-strong md:flex"><Search size={15} strokeWidth={1.5} /> Search anything <kbd className="ml-auto rounded border border-subtle px-1.5 py-0.5 text-[10px]">Ctrl K</kbd></button>
      <Button size="sm" variant="ghost" aria-label="Open search" onClick={() => openPalette(true)} className="md:hidden"><Search size={17} /></Button>
      <DropdownMenu.Root><DropdownMenu.Trigger asChild><Button size="sm" variant="primary"><Plus size={15} /> New <ChevronDown size={13} /></Button></DropdownMenu.Trigger><DropdownMenu.Portal><DropdownMenu.Content align="end" sideOffset={6} className="z-50 min-w-40 rounded-lg border border-subtle bg-elevated p-1">{[["Report","/reports/new"],["Note","/notes?new=1"],["Project","/projects?new=1"]].map(([label,href]) => <DropdownMenu.Item key={href} asChild><Link href={href} className="block rounded px-3 py-2 outline-none hover:bg-surface">New {label.toLowerCase()}</Link></DropdownMenu.Item>)}</DropdownMenu.Content></DropdownMenu.Portal></DropdownMenu.Root>
      <button type="button" aria-label="Notifications" className="relative flex h-8 w-8 items-center justify-center rounded-md text-secondary hover:bg-elevated"><Bell size={17} strokeWidth={1.5} /><span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-accent" /></button>
    </div>
  </header>;
}
