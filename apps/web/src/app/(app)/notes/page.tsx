"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { FilePlus2, Link2, List, Pin, Plus, Search, Tag } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { SplitPane } from "@/components/editor/split-pane";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api-client";
import { qk } from "@/lib/query-keys";
import { demoMode } from "@/lib/utils";
import { readDemo, upsertDemo } from "@/lib/demo-store";
import type { Note } from "@/types/api";

type Sort = "modified" | "created" | "title";
export default function NotesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("modified");
  const notes = useQuery({ queryKey: qk.notes.list({}), queryFn: () => demoMode ? Promise.resolve(readDemo<Note>("notes")) : api.get<Note[]>("/api/notes") });
  const items = notes.data ?? [];
  useEffect(() => { if (!selectedId && items.length) setSelectedId(items[0].id); }, [items, selectedId]);
  useEffect(() => { if (new URLSearchParams(window.location.search).has("new")) { void createNote(); router.replace("/notes"); } }, []);
  async function createNote() {
    const now = new Date().toISOString();
    const item: Note = { id: crypto.randomUUID(), title: "Untitled note", body: "# Untitled note\n\n", tags: [], createdAt: now, updatedAt: now };
    try {
      const saved = demoMode ? upsertDemo<Note>("notes", item) : await api.post<Note>("/api/notes", item);
      queryClient.setQueryData<Note[]>(qk.notes.list({}), old => [saved, ...(old ?? []).filter(note => note.id !== saved.id)]);
      setSelectedId(saved.id);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not create note"); }
  }
  const filtered = useMemo(() => items.filter(item => !search || (item.title + " " + item.body).toLowerCase().includes(search.toLowerCase())).sort((a,b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (sort === "title") return a.title.localeCompare(b.title);
    return new Date(sort === "created" ? b.createdAt : b.updatedAt).getTime() - new Date(sort === "created" ? a.createdAt : a.updatedAt).getTime();
  }), [items, search, sort]);
  const selected = items.find(item => item.id === selectedId);
  return <main className="page"><PageHeader title="Notes" description="Capture methods, connect ideas, and keep research close to findings." actions={<Button variant="primary" onClick={() => void createNote()}><Plus size={15} /> New note</Button>} />
    <div className="grid min-h-[650px] gap-3 xl:grid-cols-[250px_minmax(0,1fr)]"><aside className="panel flex min-h-[600px] flex-col overflow-hidden"><div className="border-b border-subtle p-3"><div className="relative"><Search size={14} className="absolute left-3 top-2.5 text-muted" /><Input placeholder="Search notes..." aria-label="Search notes" value={search} onChange={event => setSearch(event.target.value)} className="pl-8" /></div><Select value={sort} onChange={event => setSort(event.target.value as Sort)} aria-label="Sort notes" className="mt-2 w-full"><option value="modified">Recently modified</option><option value="created">Recently created</option><option value="title">Title</option></Select></div><div className="min-h-0 flex-1 overflow-y-auto p-1.5">{notes.isLoading && <div className="p-4 text-muted">Loading notes...</div>}{notes.isError && <div className="p-4 text-sev-critical">Could not load notes. <button className="underline" onClick={() => notes.refetch()}>Retry</button></div>}{!notes.isLoading && filtered.length === 0 && <div className="p-5 text-center text-muted">No notes match your search.</div>}{filtered.map(item => <button key={item.id} onClick={() => setSelectedId(item.id)} className={"mb-1 w-full rounded-md p-3 text-left transition-colors " + (selectedId === item.id ? "bg-elevated" : "hover:bg-elevated/60")}><span className="flex items-center gap-1 font-medium">{item.pinned && <Pin size={12} className="text-accent" />}{item.title}</span><span className="mt-1 block truncate text-[11px] text-secondary">{item.body.replace(/[#*\[\]]/g, "").slice(0, 60)}</span><span className="mt-2 flex items-center gap-2 text-[10px] text-muted"><span>{new Date(item.updatedAt).toLocaleDateString()}</span>{item.tags[0] && <span className="rounded bg-accent/10 px-1 text-accent">#{item.tags[0]}</span>}</span></button>)}</div></aside>
      {selected ? <NoteWorkspace key={selected.id} note={selected} allNotes={items} onSaved={saved => queryClient.setQueryData<Note[]>(qk.notes.list({}), old => (old ?? []).map(item => item.id === saved.id ? saved : item))} /> : <div className="panel flex items-center justify-center text-muted"><div className="text-center"><FilePlus2 size={25} className="mx-auto mb-3" /><p>Select a note or create one.</p><Button className="mt-4" onClick={() => void createNote()}>New note</Button></div></div>}
    </div></main>;
}

function NoteWorkspace({ note, allNotes, onSaved }: { note: Note; allNotes: Note[]; onSaved: (note: Note) => void }) {
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [status, setStatus] = useState<"saved" | "unsaved" | "saving">("saved");
  const [sideTab, setSideTab] = useState<"backlinks" | "outline">("backlinks");
  const dirty = title !== note.title || body !== note.body;
  useEffect(() => {
    if (!dirty) return;
    setStatus("unsaved");
    const timer = window.setTimeout(() => { void saveNote(); }, 1200);
    return () => window.clearTimeout(timer);
  }, [title, body]);
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  async function saveNote() {
    if (!dirty) return;
    setStatus("saving");
    const updated = { ...note, title: title.trim() || "Untitled note", body, updatedAt: new Date().toISOString() };
    try {
      const saved = demoMode ? upsertDemo<Note>("notes", updated) : await api.patch<Note>("/api/notes/" + note.id, { title: updated.title, body });
      onSaved(saved); setStatus("saved");
    } catch (error) { setStatus("unsaved"); toast.error(error instanceof Error ? error.message : "Could not save note"); }
  }
  const backlinks = allNotes.filter(item => item.id !== note.id && item.body.includes("[[" + note.title + "]]"));
  const headings = [...body.matchAll(/^#{1,6}\s+(.+)$/gm)].map(match => match[1]);
  return <section className="panel min-w-0 overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-2 border-b border-subtle px-5 py-3"><div className="flex min-w-0 flex-1 items-center gap-2"><input aria-label="Note title" value={title} onChange={event => setTitle(event.target.value)} className="min-w-0 flex-1 bg-transparent text-lg font-semibold tracking-tight outline-none" /><span className="shrink-0 text-[11px] text-muted">{status === "saved" ? "Saved" : status === "saving" ? "Saving..." : "Unsaved changes"}</span></div><Button size="sm" variant="ghost" onClick={() => void saveNote()}>Save</Button></div><div className="flex items-center gap-2 border-b border-subtle px-5 py-2 text-[11px] text-muted"><Tag size={13} />{note.tags.length ? note.tags.map(tag => <span key={tag} className="rounded bg-accent/10 px-1.5 py-0.5 text-accent">#{tag}</span>) : "No tags"}<span className="ml-auto">Modified {new Date(note.updatedAt).toLocaleDateString()}</span></div><div className="grid min-w-0 xl:grid-cols-[minmax(0,1fr)_190px]"><div className="min-w-0 p-3"><SplitPane value={body} onChange={setBody} onSave={() => void saveNote()} noteId={note.id} /></div><aside className="border-l border-subtle p-3"><div className="mb-3 flex gap-1"><Button size="sm" variant={sideTab === "backlinks" ? "secondary" : "ghost"} onClick={() => setSideTab("backlinks")}><Link2 size={13} /> Backlinks</Button><Button size="sm" variant={sideTab === "outline" ? "secondary" : "ghost"} onClick={() => setSideTab("outline")}><List size={13} /> Outline</Button></div>{sideTab === "backlinks" ? backlinks.length ? backlinks.map(item => <div key={item.id} className="mb-2 rounded border border-subtle p-2 text-[11px]">{item.title}</div>) : <p className="text-[11px] text-muted">No notes link here yet.</p> : headings.length ? headings.map((heading,index) => <p key={index} className="mb-2 text-[11px] text-secondary">{heading}</p>) : <p className="text-[11px] text-muted">Add headings to see an outline.</p>}</aside></div></section>;
}
