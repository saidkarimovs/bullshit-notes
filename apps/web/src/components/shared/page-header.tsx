import type { ReactNode } from "react";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return <header className="mb-6 flex flex-wrap items-start justify-between gap-4"><div><h1 className="page-title">{title}</h1>{description && <p className="mt-1 text-secondary">{description}</p>}</div>{actions && <div className="flex items-center gap-2">{actions}</div>}</header>;
}
