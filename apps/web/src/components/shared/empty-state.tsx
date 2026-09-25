import type { ReactNode, ComponentType } from "react";
import type { LucideProps } from "lucide-react";

export function EmptyState({ icon: Icon, title, description, action }: {
  icon: ComponentType<LucideProps>; title: string; description?: string; action?: ReactNode;
}) {
  return <div className="flex min-h-52 flex-col items-center justify-center px-6 py-10 text-center"><div className="mb-4 rounded-lg border border-subtle bg-elevated p-3 text-secondary"><Icon size={20} strokeWidth={1.5} /></div><h3 className="font-medium">{title}</h3>{description && <p className="mt-1 max-w-sm text-secondary">{description}</p>}{action && <div className="mt-4">{action}</div>}</div>;
}
