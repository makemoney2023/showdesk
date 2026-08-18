"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isDemoMode } from "@/lib/supabase/config";

type AuthMode = "signin" | "signup";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const demo = isDemoMode();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState(demo ? "secretary@demo.local" : "");
  const [password, setPassword] = useState(demo ? "demo1234" : "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const endpoint =
      !demo && mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? (mode === "signup" ? "Sign up failed" : "Login failed"));
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

  const signingUp = !demo && mode === "signup";

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="space-y-2 border border-sss-border bg-sss-ink px-5 py-6 text-[var(--sss-paper)]">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-sss-accent-soft">
          Blacksage Kennels
        </p>
        <h1 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold tracking-tight">
          {signingUp ? "Create Show Desk account" : "Show Desk login"}
        </h1>
        <p className="text-sm text-[var(--sss-paper)]/80">
          {demo
            ? "Demo mode uses the saved secretary account."
            : signingUp
              ? "Sign up with your email to use secretary and ringside."
              : "Sign in with the email you used to create your account."}
        </p>
      </div>
      <form
        onSubmit={handleSubmit}
        className="space-y-4 border border-sss-border bg-sss-elevated p-5"
      >
        {!demo ? (
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={mode === "signin" ? "default" : "outline"}
              onClick={() => {
                setMode("signin");
                setError("");
              }}
            >
              Sign in
            </Button>
            <Button
              type="button"
              variant={mode === "signup" ? "default" : "outline"}
              onClick={() => {
                setMode("signup");
                setError("");
              }}
            >
              Create account
            </Button>
          </div>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
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
            autoComplete={signingUp ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          {signingUp ? (
            <p className="text-xs text-sss-text-muted">At least 6 characters.</p>
          ) : null}
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" disabled={loading} className="w-full">
          {loading
            ? signingUp
              ? "Creating account…"
              : "Signing in…"
            : signingUp
              ? "Create account"
              : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
