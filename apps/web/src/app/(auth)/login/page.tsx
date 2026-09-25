"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, ApiError, setAccessToken } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { demoMode } from "@/lib/utils";

const schema = z.object({ email: z.email("Enter a valid email"), password: z.string().min(1, "Enter your password"), rememberMe: z.boolean() });
type Values = z.infer<typeof schema>;
type LoginResult = { accessToken?: string; requires2fa?: boolean; challengeToken?: string };

export default function LoginPage() {
  const router = useRouter();
  const setChallengeToken = useAuthStore(state => state.setChallengeToken);
  const [error, setError] = useState("");
  const { register, handleSubmit, setError: setFieldError, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "", rememberMe: false } });
  async function submit(values: Values) {
    setError("");
    try {
      const result = await api.post<LoginResult>("/api/auth/login", values);
      if (result.requires2fa && result.challengeToken) { setChallengeToken(result.challengeToken); router.push("/verify-2fa"); return; }
      if (result.accessToken) { setAccessToken(result.accessToken); router.push("/dashboard"); return; }
      setError("The server did not return a session.");
    } catch (failure) {
      if (failure instanceof ApiError && failure.details) Object.entries(failure.details).forEach(([key, message]) => { if (key === "email" || key === "password") setFieldError(key, { message: Array.isArray(message) ? message[0] : message }); });
      setError(failure instanceof Error ? failure.message : "Sign in failed");
    }
  }
  return <><span className="eyebrow">WELCOME BACK</span><h1 className="mt-3 text-3xl font-semibold tracking-tight">Sign in to SkyVision</h1><p className="mt-2 text-secondary">Pick up where your research left off.</p><form onSubmit={handleSubmit(submit)} className="mt-8 space-y-4"><label className="block"><span className="mb-1.5 block text-secondary">Email address</span><Input type="email" autoComplete="email" placeholder="you@example.com" {...register("email")} />{errors.email && <span className="mt-1 block text-[11px] text-sev-critical">{errors.email.message}</span>}</label><label className="block"><span className="mb-1.5 block text-secondary">Password</span><Input type="password" autoComplete="current-password" placeholder="Your password" {...register("password")} />{errors.password && <span className="mt-1 block text-[11px] text-sev-critical">{errors.password.message}</span>}</label><label className="flex items-center gap-2 text-secondary"><input type="checkbox" className="accent-[var(--color-accent)]" {...register("rememberMe")} /> Remember me</label>{error && <p role="alert" className="rounded-md border border-sev-critical/40 bg-sev-critical/10 p-3 text-sev-critical">{error}</p>}<Button type="submit" variant="primary" className="w-full" disabled={isSubmitting}>{isSubmitting && <Loader2 size={14} className="animate-spin" />}Sign in</Button></form><p className="mt-6 text-center text-secondary">New to SkyVision? <Link href="/signup" className="text-accent hover:underline">Create an account</Link></p>{demoMode && <div className="mt-8 border-t border-subtle pt-6"><p className="mb-3 text-center text-[11px] text-muted">Backend is not connected in demo mode.</p><Link href="/dashboard"><Button className="w-full">Explore demo workspace</Button></Link></div>}</>;
}
