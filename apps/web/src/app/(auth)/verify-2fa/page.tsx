"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, setAccessToken } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";

export default function Verify2faPage() {
  const router = useRouter();
  const challengeToken = useAuthStore(state => state.challengeToken);
  const setChallengeToken = useAuthStore(state => state.setChallengeToken);
  const [digits, setDigits] = useState(["","","","","",""]);
  const [recovery, setRecovery] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  async function submit() {
    if (!challengeToken) { setError("Your verification session expired. Sign in again."); return; }
    setPending(true); setError("");
    try {
      const result = await api.post<{ accessToken: string }>("/api/auth/verify-2fa", { challengeToken, code: recovery ? recoveryCode : digits.join(""), recovery });
      setAccessToken(result.accessToken); setChallengeToken(null); router.push("/dashboard");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Verification failed"); }
    finally { setPending(false); }
  }
  function paste(event: React.ClipboardEvent<HTMLInputElement>) {
    const value = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (value.length === 6) { event.preventDefault(); setDigits(value.split("")); refs.current[5]?.focus(); }
  }
  return <><span className="eyebrow">ACCOUNT SECURITY</span><h1 className="mt-3 text-3xl font-semibold tracking-tight">Verify it’s you</h1><p className="mt-2 text-secondary">Enter the six-digit code from your authenticator app.</p>{recovery ? <Input className="mono mt-8" placeholder="Recovery code" value={recoveryCode} onChange={event => setRecoveryCode(event.target.value)} /> : <div className="mt-8 flex gap-2">{digits.map((digit,index) => <Input key={index} ref={element => { refs.current[index] = element; }} value={digit} inputMode="numeric" maxLength={1} aria-label={"Digit " + (index + 1)} className="mono h-12 text-center text-xl" onPaste={paste} onChange={event => { const next = [...digits]; next[index] = event.target.value.replace(/\D/g, "").slice(-1); setDigits(next); if (next[index]) refs.current[index + 1]?.focus(); }} onKeyDown={event => { if (event.key === "Backspace" && !digit) refs.current[index - 1]?.focus(); }} />)}</div>}{error && <p role="alert" className="mt-4 text-sev-critical">{error}</p>}<Button variant="primary" className="mt-6 w-full" disabled={pending || (recovery ? !recoveryCode : digits.some(digit => !digit))} onClick={() => void submit()}>{pending && <Loader2 size={14} className="animate-spin" />}Verify and continue</Button><button type="button" onClick={() => setRecovery(!recovery)} className="mt-5 block w-full text-center text-accent hover:underline">{recovery ? "Use authenticator code" : "Use a recovery code"}</button><p className="mt-5 text-center text-secondary"><Link href="/login" className="hover:text-primary">Back to sign in</Link></p></>;
}
