"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetch("/api/admin/auth/session", { cache: "no-store" }).then(response => { if (response.ok) router.replace("/admin/subscribers"); }); }, [router]);

  const login = async (event: FormEvent) => {
    event.preventDefault(); setSubmitting(true); setError("");
    try {
      const response = await fetch("/api/admin/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to sign in.");
      router.replace("/admin/subscribers"); router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to sign in."); }
    finally { setSubmitting(false); }
  };

  return <main className="adminLoginPage"><nav className="setupNav shell"><Link className="brand" href="/">Morning Ledger<span>.</span></Link><Link className="closeSetup" href="/" aria-label="Close admin login and return home"><span>Close</span><b aria-hidden="true" /></Link></nav><section className="adminLoginCard"><p className="kicker">Secure administration</p><h1>Admin login.</h1><p>Sign in to manage subscribers and catalogue operations.</p><form onSubmit={login}><label><span>Email address</span><input type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} /></label><label><span>Password</span><input type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} /></label>{error && <p className="validationError" role="alert">{error}</p>}<button type="submit" disabled={submitting}>{submitting ? "Signing in…" : "Sign in"}</button></form></section></main>;
}
