"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { FilePlus2, NotebookPen, Search } from "lucide-react";
import { useUiStore } from "@/stores/ui-store";
import { flatNavigation } from "@/lib/navigation";
import { api } from "@/lib/api-client";
import { demoMode } from "@/lib/utils";

type SearchResult = { id: string; title: string; type: string; projectName?: string; href?: string };
const actions = [
  { label: "New report", href: "/reports/new", icon: FilePlus2 },
  { label: "New note", href: "/notes?new=1", icon: NotebookPen },
  { label: "New project", href: "/projects?new=1", icon: FilePlus2 },
  { label: "Start hunt session", href: "/bounty", icon: Search },
];

export function CommandPalette() {
  const router = useRouter();
  const open = useUiStore(state => state.paletteOpen);
  const setOpen = useUiStore(state => state.setPaletteOpen);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => {
    try { setRecent(JSON.parse(localStorage.getItem("skyvision-recent") ?? "[]") as string[]); } catch { /* ignore stale storage */ }
    const listener = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setOpen(!useUiStore.getState().paletteOpen); } };
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [setOpen]);
  useEffect(() => {
    if (!query.trim() || demoMode) { setResults([]); return; }
    const timer = window.setTimeout(async () => {
      try { const found = await api.get<SearchResult[]>("/api/search?q=" + encodeURIComponent(query)); setResults(found); } catch { setResults([]); }
    }, 200);
    return () => window.clearTimeout(timer);
  }, [query]);
  function navigate(href: string) {
    const next = [href, ...recent.filter(item => item !== href)].slice(0, 6);
    setRecent(next); localStorage.setItem("skyvision-recent", JSON.stringify(next));
    setOpen(false); setQuery(""); router.push(href);
  }
  if (!open) return null;
  return <div className="fixed inset-0 z-50 flex justify-center bg-black/65 px-4 pt-[12vh]" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}><Command className="h-fit w-full max-w-xl overflow-hidden rounded-xl border border-strong bg-surface text-primary" label="Command menu" shouldFilter={true}>
    <div className="flex items-center gap-3 border-b border-subtle px-4"><Search size={18} className="text-muted" /><Command.Input autoFocus value={query} onValueChange={setQuery} placeholder="Search commands, pages, reports..." className="h-12 w-full bg-transparent outline-none placeholder:text-muted" /><kbd className="rounded border border-subtle px-1.5 py-0.5 text-[10px] text-muted">ESC</kbd></div>
    <Command.List className="max-h-[55vh] overflow-y-auto p-2"><Command.Empty className="p-6 text-center text-secondary">No results found.</Command.Empty>
      {!query && recent.length > 0 && <Command.Group heading="Recent" className="px-2 py-1 text-[11px] uppercase tracking-wider text-muted">{recent.map(href => <Command.Item key={href} value={"recent " + href} onSelect={() => navigate(href)} className="mt-1 cursor-pointer rounded-md px-3 py-2 text-[13px] normal-case tracking-normal text-primary data-[selected=true]:bg-elevated">{flatNavigation.find(item => item.href === href)?.label ?? href}</Command.Item>)}</Command.Group>}
      <Command.Group heading="Actions" className="px-2 py-1 text-[11px] uppercase tracking-wider text-muted">{actions.map(action => <Command.Item key={action.href} value={action.label} onSelect={() => navigate(action.href)} className="mt-1 flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-[13px] normal-case tracking-normal text-primary data-[selected=true]:bg-elevated"><action.icon size={16} strokeWidth={1.5} />{action.label}</Command.Item>)}</Command.Group>
      <Command.Group heading="Navigation" className="px-2 py-1 text-[11px] uppercase tracking-wider text-muted">{flatNavigation.map(item => <Command.Item key={item.href} value={item.label} onSelect={() => navigate(item.href)} className="mt-1 flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-[13px] normal-case tracking-normal text-primary data-[selected=true]:bg-elevated"><item.icon size={16} strokeWidth={1.5} />{item.label}</Command.Item>)}</Command.Group>
      {results.length > 0 && <Command.Group heading="Search results" className="px-2 py-1 text-[11px] uppercase tracking-wider text-muted">{results.map(item => <Command.Item key={item.id} value={item.title} onSelect={() => navigate(item.href ?? "/" + item.type.toLowerCase() + "s/" + item.id)} className="mt-1 cursor-pointer rounded-md px-3 py-2 text-[13px] normal-case tracking-normal text-primary data-[selected=true]:bg-elevated"><span>{item.title}</span><span className="ml-2 text-muted">{item.projectName}</span></Command.Item>)}</Command.Group>}
    </Command.List>
  </Command></div>;
}
