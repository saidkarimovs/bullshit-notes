"use client";

import { useEffect, useState } from "react";
import { Columns2, Eye, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarkdownEditor } from "./markdown-editor";
import { MarkdownPreview } from "./markdown-preview";

type Mode = "source" | "split" | "preview";
export function SplitPane({ value, onChange, onSave, noteId }: { value: string; onChange: (value: string) => void; onSave?: () => void; noteId?: string }) {
  const [mode, setMode] = useState<Mode>("split");
  useEffect(() => { const saved = localStorage.getItem("skyvision-editor-mode") as Mode | null; if (saved && ["source","split","preview"].includes(saved)) setMode(saved); }, []);
  function select(next: Mode) { setMode(next); localStorage.setItem("skyvision-editor-mode", next); }
  return <div className="min-w-0"><div className="mb-2 flex justify-end gap-1" role="group" aria-label="Editor view"><Button size="sm" variant={mode === "source" ? "secondary" : "ghost"} onClick={() => select("source")} title="Source only"><Code2 size={14} /></Button><Button size="sm" variant={mode === "split" ? "secondary" : "ghost"} onClick={() => select("split")} title="Split view"><Columns2 size={14} /></Button><Button size="sm" variant={mode === "preview" ? "secondary" : "ghost"} onClick={() => select("preview")} title="Preview only"><Eye size={14} /></Button></div><div className={mode === "split" ? "grid min-h-[520px] grid-cols-1 gap-3 2xl:grid-cols-2" : "min-h-[520px]"}>{mode !== "preview" && <MarkdownEditor value={value} onChange={onChange} onSave={onSave} noteId={noteId} />}{mode !== "source" && <div className="max-h-[700px] overflow-y-auto rounded-md border border-subtle bg-surface p-5"><MarkdownPreview source={value} /></div>}</div></div>;
}

