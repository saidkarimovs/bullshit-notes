// Heuristic conversion of extracted PDF plain text into Markdown.
//   - ALL CAPS or short (<60 chars) unpunctuated lines -> headings
//   - "1." / "2)" numbered lines -> ordered list items
//   - bullet-glyph lines -> unordered list items
//   - runs of monospace-ish / indented lines -> fenced code blocks
//   - blank-line-separated blocks -> paragraphs

export interface PdfConversion {
  markdown: string;
  warnings: string[];
}

const BULLET_RE = /^\s*[•▪◦‣·*-]\s+/;
const NUMBERED_RE = /^\s*\d+[.)]\s+/;
const CODEY_RE = /^\s{4,}\S|[{};=<>]|\b(function|const|let|var|SELECT|curl|GET|POST)\b/;

export function pdfTextToMarkdown(text: string): PdfConversion {
  const warnings: string[] = [];
  const rawLines = text.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];

  let codeBuffer: string[] = [];
  const flushCode = () => {
    if (codeBuffer.length) {
      out.push("```", ...codeBuffer, "```", "");
      codeBuffer = [];
    }
  };

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const trimmed = line.trim();

    if (trimmed === "") {
      flushCode();
      if (out.length && out[out.length - 1] !== "") out.push("");
      continue;
    }

    // Consecutive code-like lines accumulate into a fenced block.
    if (CODEY_RE.test(line) && !BULLET_RE.test(trimmed) && !NUMBERED_RE.test(trimmed)) {
      codeBuffer.push(line.replace(/\s+$/, ""));
      continue;
    }
    flushCode();

    if (BULLET_RE.test(trimmed)) {
      out.push(`- ${trimmed.replace(BULLET_RE, "")}`);
      continue;
    }
    if (NUMBERED_RE.test(trimmed)) {
      out.push(trimmed.replace(NUMBERED_RE, (m) => m.trim() + " ").trimStart());
      continue;
    }

    if (isHeading(trimmed)) {
      const level = trimmed === trimmed.toUpperCase() ? "##" : "###";
      out.push(`${level} ${toTitle(trimmed)}`, "");
      continue;
    }

    out.push(trimmed);
  }
  flushCode();

  if (out.length === 0) warnings.push("No extractable text produced any content");

  const markdown = out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return { markdown, warnings };
}

function isHeading(line: string): boolean {
  if (line.length >= 60) return false;
  const hasPunctuationEnd = /[.:,;]$/.test(line);
  if (hasPunctuationEnd) return false;
  const isAllCaps = line === line.toUpperCase() && /[A-Z]/.test(line);
  const isShortTitleCase = line.split(/\s+/).length <= 8 && !/[.]/.test(line);
  return isAllCaps || isShortTitleCase;
}

function toTitle(line: string): string {
  if (line === line.toUpperCase()) {
    return line
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return line;
}
