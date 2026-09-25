// {{NAME}} placeholder handling for payload bodies.

const VAR_RE = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g;

// Unique placeholder names found in a body, in first-seen order.
export function extractVariables(body: string): string[] {
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  VAR_RE.lastIndex = 0;
  while ((m = VAR_RE.exec(body)) !== null) {
    seen.add(m[1]);
  }
  return [...seen];
}

export interface RenderResult {
  rendered: string;
  unresolved: string[];
}

/**
 * Substitute every {{NAME}} with vars[NAME]. Placeholders with no matching
 * value are collected in `unresolved` and left in place (never silently kept
 * without being reported).
 */
export function renderPayload(
  body: string,
  vars: Record<string, string>,
): RenderResult {
  const unresolved = new Set<string>();
  const rendered = body.replace(VAR_RE, (_match, name: string) => {
    if (Object.prototype.hasOwnProperty.call(vars, name)) {
      return vars[name];
    }
    unresolved.add(name);
    return `{{${name}}}`;
  });
  return { rendered, unresolved: [...unresolved] };
}
