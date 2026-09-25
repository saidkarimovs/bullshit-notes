"use client";

import { useEffect, useRef } from "react";
import { basicSetup } from "codemirror";
import { EditorState, type Extension } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { markdown } from "@codemirror/lang-markdown";

const theme = EditorView.theme({
  "&": { backgroundColor: "transparent", color: "var(--color-text-primary)", minHeight: "430px", fontSize: "13px", fontFamily: "var(--font-mono)" },
  ".cm-content": { padding: "16px 0", caretColor: "var(--color-accent)", lineHeight: "1.7" },
  ".cm-line": { padding: "0 16px" },
  ".cm-gutters": { backgroundColor: "transparent", color: "var(--color-text-muted)", borderRight: "1px solid var(--color-border-subtle)" },
  ".cm-activeLine, .cm-activeLineGutter": { backgroundColor: "var(--color-bg-elevated)" },
  ".cm-cursor": { borderLeftColor: "var(--color-accent)" },
  ".cm-selectionBackground": { backgroundColor: "var(--color-accent-dim) !important" },
  "&.cm-focused": { outline: "none" },
}, { dark: true });

export function MarkdownEditor({ value, onChange, onSave, noteId, placeholder, extensions = [] }: {
  value: string; onChange: (value: string) => void; onSave?: () => void;
  noteId?: string; placeholder?: string; extensions?: Extension[];
}) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const changeRef = useRef(onChange);
  const saveRef = useRef(onSave);
  changeRef.current = onChange;
  saveRef.current = onSave;
  useEffect(() => {
    if (!host.current) return;
    const editor = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup, markdown(), theme,
          keymap.of([{ key: "Mod-s", run: () => { saveRef.current?.(); return true; } }]),
          EditorView.updateListener.of(update => { if (update.docChanged) changeRef.current(update.state.doc.toString()); }),
          ...extensions,
        ],
      }),
      parent: host.current,
    });
    view.current = editor;
    return () => { editor.destroy(); view.current = null; };
  }, [noteId]);
  useEffect(() => {
    const editor = view.current;
    if (editor && editor.state.doc.toString() !== value) editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: value } });
  }, [value]);
  return <div className="min-w-0 overflow-hidden rounded-md border border-subtle bg-base" aria-label={placeholder ?? "Markdown editor"} ref={host} />;
}
