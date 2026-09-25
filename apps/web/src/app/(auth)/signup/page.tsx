"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, ApiError, setAccessToken } from "@/lib/api-client";
import { demoMode } from "@/lib/utils";

const schema = z.object({ name: z.string().min(2, "Enter your name"), email: z.email("Enter a valid email"), password: z.string().min(12, "Use at least 12 characters").regex(/[A-Za-z]/, "Include a letter").regex(/\d/, "Include a digit"), confirm: z.string() }).refine(value => value.password === value.confirm, { path: ["confirm"], message: "Passwords do not match" });
type Values = z.infer<typeof schema>;
export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const { register, handleSubmit, watch, setError: setFieldError, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema) });
  const password = watch("password") ?? "";
  const checks = [password.length >= 12, /[A-Za-z]/.test(password), /\d/.test(password)];
  const strength = checks.filter(Boolean).length + (password.length >= 18 ? 1 : 0);
  async function submit(values: Values) {
    setError("");
    try {
      const result = await api.post<{ accessToken?: string }>("/api/auth/signup", { name: values.name, email: values.email, password: values.password });
      if (result.accessToken) { setAccessToken(result.accessToken); router.push("/dashboard"); }
      else router.push("/login");
    } catch (failure) {
      if (failure instanceof ApiError && failure.details) Object.entries(failure.details).forEach(([key, message]) => { if (key === "name" || key === "email" || key === "password") setFieldError(key, { message: Array.isArray(message) ? message[0] : message }); });
      setError(failure instanceof Error ? failure.message : "Sign up failed");
    }
  }
  return <><span className="eyebrow">GET STARTED</span><h1 className="mt-3 text-3xl font-semibold tracking-tight">Create your account</h1><p className="mt-2 text-secondary">A focused home for your security research.</p><form onSubmit={handleSubmit(submit)} className="mt-7 space-y-4"><label className="block"><span className="mb-1 block text-secondary">Name</span><Input autoComplete="name" {...register("name")} />{errors.name && <span className="text-[11px] text-sev-critical">{errors.name.message}</span>}</label><label className="block"><span className="mb-1 block text-secondary">Email address</span><Input type="email" autoComplete="email" {...register("email")} />{errors.email && <span className="text-[11px] text-sev-critical">{errors.email.message}</span>}</label><label className="block"><span className="mb-1 block text-secondary">Password</span><Input type="password" autoComplete="new-password" {...register("password")} />{errors.password && <span className="text-[11px] text-sev-critical">{errors.password.message}</span>}</label><div><div className="flex gap-1.5">{[0,1,2,3].map(index => <span key={index} className={"h-1 flex-1 rounded " + (index < strength ? "bg-accent" : "bg-border-strong")} />)}</div><div className="mt-2 space-y-1 text-[11px]">{[["At least 12 characters",checks[0]],["At least one letter",checks[1]],["At least one digit",checks[2]]].map(([label,valid]) => <p key={String(label)} className={"flex items-center gap-1.5 " + (valid ? "text-accent" : "text-muted")}><Check size={12} />{label}</p>)}</div></div><label className="block"><span className="mb-1 block text-secondary">Confirm password</span><Input type="password" autoComplete="new-password" {...register("confirm")} />{errors.confirm && <span className="text-[11px] text-sev-critical">{errors.confirm.message}</span>}</label>{error && <p role="alert" className="rounded-md border border-sev-critical/40 bg-sev-critical/10 p-3 text-sev-critical">{error}</p>}<Button type="submit" variant="primary" className="w-full" disabled={isSubmitting}>{isSubmitting && <Loader2 size={14} className="animate-spin" />}Create account</Button></form><p className="mt-5 text-center text-secondary">Already have an account? <Link href="/login" className="text-accent hover:underline">Sign in</Link></p>{demoMode && <Link href="/dashboard"><Button className="mt-6 w-full">Explore demo workspace</Button></Link>}</>;
}
