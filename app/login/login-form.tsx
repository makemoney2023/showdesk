"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isDemoMode } from "@/lib/supabase/config";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(
    isDemoMode() ? "secretary@demo.local" : "",
  );
  const [password, setPassword] = useState(isDemoMode() ? "demo1234" : "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? "Login failed");
      return;
    }
    const next = searchParams.get("next");
    const dest =
      next && next.startsWith("/") && !next.startsWith("//")
        ? next
        : "/admin/entries";
    router.push(dest);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="space-y-2 border border-sss-border bg-sss-ink px-5 py-6 text-[var(--sss-paper)]">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-sss-accent-soft">
          Blacksage Kennels
        </p>
        <h1 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold tracking-tight">
          Show Desk login
        </h1>
        <p className="text-sm text-[var(--sss-paper)]/80">
          Sign in to Show Desk. Demo mode uses the saved secretary account.
        </p>
      </div>
      <form
        onSubmit={handleSubmit}
        className="space-y-4 border border-sss-border bg-sss-elevated p-5"
      >
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
