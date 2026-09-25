// Wikilink parser. Extracts unique [[Target]] / [[Target|alias]] targets.
// The alias (after |) is display-only; the link target is the part before |.

const WIKILINK_RE = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;

export function parseWikilinks(bodyMd: string): string[] {
  const targets = new Set<string>();
  let match: RegExpExecArray | null;
  // Reset lastIndex defensively; the regex has the global flag.
  WIKILINK_RE.lastIndex = 0;
  while ((match = WIKILINK_RE.exec(bodyMd)) !== null) {
    const raw = match[1]?.trim();
    if (raw) targets.add(raw);
  }
  return [...targets];
}
