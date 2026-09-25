import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("w-full min-h-24 rounded-md border border-subtle bg-elevated px-3 py-2 text-primary placeholder:text-muted outline-none transition-colors focus:border-accent", className)} {...props} />;
}
