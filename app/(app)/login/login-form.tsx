"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isDemoMode } from "@/lib/supabase/config";
import type { SessionOrg } from "@/lib/auth/org";

type AuthMode = "signin" | "create" | "join";

type SessionPayload = {
  user?: {
    org?: SessionOrg | null;
    orgs?: SessionOrg[];
  } | null;
  org?: SessionOrg;
  needsClub?: boolean;
  needsClubSelect?: boolean;
  error?: string;
};

export function LoginForm({
  club,
}: {
  club?: { name: string; slug: string } | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const demo = isDemoMode();
  const initialMode = (searchParams.get("mode") === "join"
    ? "join"
    : searchParams.get("mode") === "create"
      ? "create"
      : "signin") as AuthMode;
  const [mode, setMode] = useState<AuthMode>(demo ? "signin" : initialMode);
  const [email, setEmail] = useState(demo ? "secretary@demo.local" : "");
  const [password, setPassword] = useState(demo ? "demo1234" : "");
  const [clubName, setClubName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [orgChoices, setOrgChoices] = useState<SessionOrg[] | null>(null);

  function destination() {
    const next = searchParams.get("next");
    return next && next.startsWith("/") && !next.startsWith("//")
      ? next
      : "/admin/entries";
  }

  function finish(data: SessionPayload) {
    if (data.needsClubSelect && data.user?.orgs?.length) {
      setOrgChoices(data.user.orgs);
      return;
    }
    if (data.needsClub) {
      setMode("create");
      setError("Create your club or join one with an invite code.");
      return;
    }
    router.push(destination());
    router.refresh();
  }

  async function selectOrg(org: SessionOrg) {
    setLoading(true);
    setError("");
    const res = await fetch("/api/orgs/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ org_id: org.id }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? "Could not open that club");
      return;
    }
    router.push(destination());
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const signingUp = !demo && mode !== "signin";
    const endpoint = signingUp ? "/api/auth/signup" : "/api/auth/login";
    const payload: Record<string, string> = { email, password };
    if (club?.slug) payload.slug = club.slug;
    if (mode === "create") payload.club_name = clubName;
    if (mode === "join") payload.invite_code = inviteCode;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as SessionPayload;
    setLoading(false);
    if (!res.ok) {
      setError(
        data.error ??
          (signingUp ? "Could not create your club account" : "Login failed"),
      );
      return;
    }
    finish(data);
  }

  const heading =
    mode === "create"
      ? "Create your club"
      : mode === "join"
        ? club
          ? `Join ${club.name}`
          : "Join a club"
        : club
          ? `${club.name} login`
          : "Show Desk login";

  if (orgChoices) {
    return (
      <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center py-8">
        <div className="mx-auto w-full max-w-md overflow-hidden rounded-sss-xl shadow-sss-overlay">
          <div className="space-y-3 bg-sss-ink px-6 py-8 text-[var(--sss-paper)]">
            <p className="sss-eyebrow text-sss-accent-soft">Your clubs</p>
            <h1 className="font-[family-name:var(--font-fraunces)] text-3xl font-semibold tracking-tight">
              Choose a club
            </h1>
          </div>
          <div className="space-y-3 border border-t-0 border-sss-border bg-sss-elevated p-6">
            <p className="text-sm text-sss-text-secondary">
              This account belongs to more than one club. Open the desk you want
              to use.
            </p>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="space-y-2">
              {orgChoices.map((org) => (
                <Button
                  key={org.id}
                  type="button"
                  variant="outline"
                  className="w-full justify-start"
                  disabled={loading}
                  onClick={() => void selectOrg(org)}
                >
                  {org.name}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center py-8">
      <div className="mx-auto w-full max-w-md overflow-hidden rounded-sss-xl shadow-sss-overlay">
        <div className="space-y-3 bg-sss-ink px-6 py-8 text-[var(--sss-paper)]">
          <p className="sss-eyebrow text-sss-accent-soft">
            {club?.name ?? "Show Desk"}
          </p>
          <h1 className="font-[family-name:var(--font-fraunces)] text-3xl font-semibold tracking-tight">
            {heading}
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
              {mode === "create"
                ? "Your club gets its own desk, roster, and login link. Other clubs cannot see it."
                : mode === "join"
                  ? "Use the invite code from your show secretary."
                  : club
                    ? `Sign in to the ${club.name} desk.`
                    : "Sign in to your club, or create a new one."}
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
                variant={mode !== "signin" ? "default" : "outline"}
                onClick={() => {
                  setMode(club ? "join" : "create");
                  setError("");
                }}
              >
                {club ? "Join club" : "Create your club"}
              </Button>
            </div>
          ) : null}
          {mode === "create" && !demo ? (
            <div className="space-y-2">
              <Label htmlFor="club_name">Club name</Label>
              <Input
                id="club_name"
                value={clubName}
                onChange={(e) => setClubName(e.target.value)}
                placeholder="True North Rottweiler Klub"
                required
              />
            </div>
          ) : null}
          {mode === "join" && !demo ? (
            <div className="space-y-2">
              <Label htmlFor="invite_code">Invite code</Label>
              <Input
                id="invite_code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                autoCapitalize="characters"
                required
              />
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
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            {mode !== "signin" ? (
              <p className="text-xs text-sss-text-muted">At least 6 characters.</p>
            ) : null}
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={loading} className="w-full">
            {loading
              ? mode === "create"
                ? "Creating club…"
                : mode === "join"
                  ? "Joining…"
                  : "Signing in…"
              : mode === "create"
                ? "Create club"
                : mode === "join"
                  ? "Join club"
                  : "Sign in"}
          </Button>
          {!demo && mode === "create" ? (
            <button
              type="button"
              className="w-full text-center text-sm text-sss-text-secondary underline"
              onClick={() => {
                setMode("join");
                setError("");
              }}
            >
              Have an invite code?
            </button>
          ) : null}
          {!demo && !club && mode === "signin" ? (
            <p className="text-center text-xs text-sss-text-muted">
              Each club has its own login at /c/your-club/login
            </p>
          ) : null}
        </form>
      </div>
    </div>
  );
}
