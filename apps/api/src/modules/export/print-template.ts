// Wraps rendered HTML in a paginated, print-ready A4 document with a cover
// page, running header, and footer page numbers.

export interface CoverMeta {
  title: string;
  severity?: string;
  cvssVector?: string | null;
  target?: string | null;
  date?: string;
  subtitle?: string;
}

const SEVERITY_BG: Record<string, string> = {
  INFO: "#6b7280",
  LOW: "#3b82f6",
  MEDIUM: "#f59e0b",
  HIGH: "#ef4444",
  CRITICAL: "#991b1b",
};

export function printStylesheet(headerTitle: string): string {
  return `
    @page {
      size: A4;
      margin: 20mm;
      @top-center { content: "${escapeCss(headerTitle)}"; font-size: 9px; color: #888; }
      @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 9px; color: #888; }
    }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; font-size: 12px; line-height: 1.55; color: #111; }
    h1,h2,h3 { line-height: 1.25; }
    h1 { font-size: 22px; } h2 { font-size: 17px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin-top: 24px; }
    pre { background: #0d1117; color: #e6edf3; padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 11px; }
    code { font-family: "SFMono-Regular", Consolas, monospace; }
    :not(pre) > code { background: #f3f4f6; padding: 1px 4px; border-radius: 4px; }
    table { border-collapse: collapse; width: 100%; margin: 12px 0; }
    th, td { border: 1px solid #d1d5db; padding: 6px 8px; text-align: left; font-size: 11px; }
    blockquote { border-left: 3px solid #d1d5db; margin: 12px 0; padding-left: 12px; color: #4b5563; }
    .cover { page-break-after: always; display: flex; flex-direction: column; justify-content: center; height: 90vh; }
    .cover .title { font-size: 32px; font-weight: 700; margin-bottom: 8px; }
    .cover .subtitle { font-size: 15px; color: #4b5563; margin-bottom: 24px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 999px; color: #fff; font-weight: 700; font-size: 13px; }
    .meta-row { margin-top: 10px; font-size: 13px; }
    .meta-row b { display: inline-block; width: 120px; color: #6b7280; }
  `;
}

export function renderCover(meta: CoverMeta): string {
  const sevBg = meta.severity ? SEVERITY_BG[meta.severity] ?? "#6b7280" : null;
  return `
    <section class="cover">
      <div class="title">${escapeHtml(meta.title)}</div>
      ${meta.subtitle ? `<div class="subtitle">${escapeHtml(meta.subtitle)}</div>` : ""}
      ${
        sevBg
          ? `<div class="meta-row"><b>Severity</b> <span class="badge" style="background:${sevBg}">${escapeHtml(
              meta.severity!,
            )}</span></div>`
          : ""
      }
      ${meta.cvssVector ? `<div class="meta-row"><b>CVSS</b> ${escapeHtml(meta.cvssVector)}</div>` : ""}
      ${meta.target ? `<div class="meta-row"><b>Target</b> ${escapeHtml(meta.target)}</div>` : ""}
      <div class="meta-row"><b>Date</b> ${escapeHtml(meta.date ?? new Date().toISOString().slice(0, 10))}</div>
    </section>
  `;
}

export function wrapDocument(
  headerTitle: string,
  cover: string,
  bodyHtml: string,
): string {
  return `<!doctype html>
<html><head><meta charset="utf-8">
<style>${printStylesheet(headerTitle)}</style>
</head>
<body>
${cover}
<main>${bodyHtml}</main>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeCss(s: string): string {
  return s.replace(/["\\]/g, "\\$&");
}
