"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Info } from "lucide-react";
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
    <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center py-8">
      <div className="mx-auto w-full max-w-md overflow-hidden rounded-sss-xl shadow-sss-overlay">
        <div className="space-y-3 bg-sss-ink px-6 py-8 text-[var(--sss-paper)]">
          <p className="sss-eyebrow text-sss-accent-soft">
            Blacksage Kennels
          </p>
          <h1 className="font-[family-name:var(--font-fraunces)] text-3xl font-semibold tracking-tight">
            {signingUp ? "Create Show Desk account" : "Show Desk login"}
          </h1>
        </div>
        <form
          onSubmit={handleSubmit}
          className="space-y-4 border border-t-0 border-sss-border bg-sss-elevated p-6"
        >
          {demo ? (
            <p className="flex items-start gap-2 rounded-sss-md bg-sss-lifted px-3 py-2 text-sm text-sss-text-secondary">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-sss-accent-deep" />
              Demo mode uses secretary@demo.local or steward@demo.local
              (password demo1234).
            </p>
          ) : (
            <p className="text-sm text-sss-text-secondary">
              {signingUp
                ? "Sign up with your email to use secretary and ringside."
                : "Sign in with the email you used to create your account."}
            </p>
          )}
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
    </div>
  );
}
