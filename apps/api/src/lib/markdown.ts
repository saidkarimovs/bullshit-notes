import { esmImport } from "./esm";

// Render Markdown to sanitized HTML. Report/note bodies contain attacker-
// controlled payload text that will be opened in a headless browser, so the
// pipeline ALWAYS runs rehype-sanitize.
export async function renderMarkdown(md: string): Promise<string> {
  const [
    { unified },
    remarkParse,
    remarkGfm,
    remarkMath,
    remarkRehype,
    rehypeSanitize,
    rehypeHighlight,
    rehypeStringify,
  ] = await Promise.all([
    esmImport<{ unified: () => any }>("unified"),
    esmImport<{ default: unknown }>("remark-parse"),
    esmImport<{ default: unknown }>("remark-gfm"),
    esmImport<{ default: unknown }>("remark-math"),
    esmImport<{ default: unknown }>("remark-rehype"),
    esmImport<{ default: unknown }>("rehype-sanitize"),
    esmImport<{ default: unknown }>("rehype-highlight"),
    esmImport<{ default: unknown }>("rehype-stringify"),
  ]);

  const file = await unified()
    .use(remarkParse.default as never)
    .use(remarkGfm.default as never)
    .use(remarkMath.default as never)
    .use(remarkRehype.default as never, { allowDangerousHtml: false })
    .use(rehypeSanitize.default as never)
    .use(rehypeHighlight.default as never, { detect: true, ignoreMissing: true })
    .use(rehypeStringify.default as never)
    .process(md);

  return String(file);
}
