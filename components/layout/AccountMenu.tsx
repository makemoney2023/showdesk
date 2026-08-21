"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { accountRoleLabel } from "@/lib/domain/show-day";
import type { RoleShellKind } from "@/lib/domain/role-shell";

type AccountUser = { id: string; email: string; name?: string };

export function AccountMenu({ kind }: { kind: RoleShellKind }) {
  const router = useRouter();
  const [user, setUser] = useState<AccountUser | null>(null);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const role = accountRoleLabel(kind);

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
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
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
        onClick={() => setOpen((v) => !v)}
      >
        {user?.name ?? "Account"}
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
