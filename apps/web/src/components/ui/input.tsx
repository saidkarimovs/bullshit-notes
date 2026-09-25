import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn("h-9 w-full rounded-md border border-subtle bg-elevated px-3 text-primary placeholder:text-muted outline-none transition-colors focus:border-accent", className)} {...props} />;
});
