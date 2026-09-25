"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const quotes = [
  "Keep the thread. Find the signal.",
  "Every finding starts with a question.",
  "Research is clearer when context stays connected.",
];
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const [quote, setQuote] = useState(0);
  useEffect(() => { const timer = window.setInterval(() => setQuote(value => (value + 1) % quotes.length), 6000); return () => window.clearInterval(timer); }, []);
  return <div className="grid min-h-screen lg:grid-cols-[40%_60%]"><div className="flex min-h-screen flex-col bg-base px-8 py-7 md:px-14"><Link href="/" className="mono text-[18px] font-semibold tracking-[-.065em]">skyvision<span className="text-accent">.</span></Link><div className="flex flex-1 items-center justify-center"><div className="w-full max-w-[370px]">{children}</div></div><p className="text-[11px] text-muted">Self-hosted security research workspace</p></div><div className="relative hidden overflow-hidden border-l border-subtle bg-surface lg:flex lg:items-end lg:p-16"><svg className="absolute inset-0 h-full w-full opacity-50" viewBox="0 0 700 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><pattern id="lattice" width="78" height="68" patternUnits="userSpaceOnUse"><path d="M0 34L39 0L78 34L39 68Z M39 0V68" fill="none" stroke="var(--color-border-strong)" strokeWidth=".5" /><circle cx="39" cy="0" r="1.8" fill="var(--color-accent)" /><circle cx="0" cy="34" r="1" fill="var(--color-border-strong)" /></pattern></defs><rect width="100%" height="100%" fill="url(#lattice)" /></svg><div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg-surface)] via-transparent to-transparent" /><div className="relative z-10 max-w-md"><span className="eyebrow">SKYVISION</span><p className="mt-4 text-3xl font-medium leading-tight tracking-tight">{quotes[quote]}</p><div className="mt-7 flex gap-1.5">{quotes.map((_,index) => <span key={index} className={"h-1 rounded transition-all " + (index === quote ? "w-8 bg-accent" : "w-2 bg-border-strong")} />)}</div></div></div></div>;
}
