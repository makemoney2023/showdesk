"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { currentStandaloneDisplay } from "@/lib/client/pwa-install";
import { openPwaInstallPrompt } from "@/components/pwa/PwaInstallHost";
import { accountRoleLabel } from "@/lib/domain/show-day";
import type { RoleShellKind } from "@/lib/domain/role-shell";

type AccountUser = { id: string; email: string; name?: string };

function accountInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`;
  return letters.toUpperCase() || "A";
}

export function AccountMenu({
  kind,
  compact = false,
}: {
  kind: RoleShellKind;
  compact?: boolean;
}) {
  const router = useRouter();
  const [user, setUser] = useState<AccountUser | null>(null);
  const [open, setOpen] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const role = accountRoleLabel(kind);

  useEffect(() => {
    setCanInstall(!currentStandaloneDisplay());
  }, []);

  useEffect(() => {
    void fetch("/api/auth/login")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { user?: AccountUser } | null) => {
        setUser(data?.user ?? null);
      });
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  async function signOut() {
    await fetch("/api/auth/login", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  if (kind === "minimal") return null;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="inline-flex min-h-11 items-center rounded-sss-md px-2 text-sm text-sss-text-secondary hover:bg-sss-lifted hover:text-sss-accent-deep"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account"
        onClick={() => setOpen((v) => !v)}
      >
        {compact ? (
          <>
            <span
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-sss-lifted text-xs font-semibold md:hidden"
              aria-hidden
            >
              {accountInitials(user?.name ?? user?.email ?? "Account")}
            </span>
            <span className="hidden md:inline">{user?.name ?? "Account"}</span>
          </>
        ) : (
          user?.name ?? "Account"
        )}
      </button>
      {open ? (
        <div
          role="menu"
          className="sss-paper absolute right-0 z-50 mt-1 w-64 space-y-2 p-3"
        >
          <p className="font-[family-name:var(--font-fraunces)] text-sm font-semibold">
            {user?.name ?? user?.email ?? "Not signed in"}
          </p>
          {user?.email && user?.name ? (
            <p className="text-xs text-sss-text-secondary">{user.email}</p>
          ) : null}
          {role && user ? (
            <p className="text-xs uppercase tracking-[0.16em] text-sss-text-muted">
              {role}
            </p>
          ) : null}
          {canInstall ? (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setOpen(false);
                openPwaInstallPrompt();
              }}
            >
              Install app
            </Button>
          ) : null}
          {user ? (
            <Button variant="outline" className="w-full" onClick={() => void signOut()}>
              Sign out
            </Button>
          ) : (
            <Button asChild variant="outline" className="w-full">
              <Link href="/login">Sign in</Link>
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
