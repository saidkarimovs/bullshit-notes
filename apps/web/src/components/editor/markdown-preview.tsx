"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

export function MarkdownPreview({ source, onLinkClick }: { source: string; onLinkClick?: (href: string) => void }) {
  return <div className="prose-preview"><ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]} components={{
    a: ({ href, children, ...props }) => <a href={href} {...props} onClick={event => { if (href?.startsWith("/notes/") && onLinkClick) { event.preventDefault(); onLinkClick(href); } }}>{children}</a>,
  }}>{source}</ReactMarkdown></div>;
}
