import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
};

export function Button({ className, variant = "secondary", size = "md", ...props }: ButtonProps) {
  const variants = {
    primary: "bg-accent border-accent text-bg-base hover:brightness-110",
    secondary: "bg-elevated border-subtle text-primary hover:border-strong",
    ghost: "bg-transparent border-transparent text-secondary hover:bg-elevated hover:text-primary",
    danger: "bg-transparent border-sev-critical text-sev-critical hover:bg-sev-critical/10",
  };
  return <button className={cn("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border px-3 font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent/40", size === "sm" ? "h-8 text-xs" : "h-9 text-[13px]", variants[variant], className)} {...props} />;
}
