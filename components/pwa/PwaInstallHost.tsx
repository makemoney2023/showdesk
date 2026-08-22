"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  clearPwaDismissedAt,
  currentStandaloneDisplay,
  readPwaDismissedAt,
  registerShowDeskServiceWorker,
  writePwaDismissedAt,
  type BeforeInstallPromptEvent,
} from "@/lib/client/pwa-install";
import {
  pwaInstallKind,
  shouldOfferPwaInstall,
  type PwaInstallKind,
} from "@/lib/domain/pwa-install";

const AUTO_OPEN_MS = 1800;

export function PwaInstallHost() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<PwaInstallKind>("manual");
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null);

  const refreshKind = useCallback((canPrompt: boolean) => {
    setKind(
      pwaInstallKind({
        userAgent: navigator.userAgent,
        maxTouchPoints: navigator.maxTouchPoints,
        canPrompt,
      }),
    );
  }, []);

  const maybeOpen = useCallback((canPrompt: boolean) => {
    if (currentStandaloneDisplay()) return;
    if (
      !shouldOfferPwaInstall({
        standalone: false,
        dismissedAt: readPwaDismissedAt(),
        now: Date.now(),
      })
    ) {
      return;
    }
    refreshKind(canPrompt);
    setOpen(true);
  }, [refreshKind]);

  useEffect(() => {
    void registerShowDeskServiceWorker();
    refreshKind(false);

    function onBeforeInstall(event: Event) {
      event.preventDefault();
      const prompt = event as BeforeInstallPromptEvent;
      promptRef.current = prompt;
      setPromptEvent(prompt);
      refreshKind(true);
    }
    function onInstalled() {
      setOpen(false);
      setPromptEvent(null);
      writePwaDismissedAt();
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    const timer = window.setTimeout(() => {
      maybeOpen(Boolean(promptRef.current));
    }, AUTO_OPEN_MS);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      window.clearTimeout(timer);
    };
  }, [maybeOpen, refreshKind]);

  useEffect(() => {
    function onOpen() {
      if (currentStandaloneDisplay()) return;
      clearPwaDismissedAt();
      refreshKind(Boolean(promptEvent));
      setOpen(true);
    }
    window.addEventListener("sss:open-pwa-install", onOpen);
    return () => window.removeEventListener("sss:open-pwa-install", onOpen);
  }, [promptEvent, refreshKind]);

  if (!open) return null;

  async function install() {
    if (!promptEvent) return;
    setBusy(true);
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === "accepted") {
        setOpen(false);
        writePwaDismissedAt();
      }
    } finally {
      setBusy(false);
    }
  }

  function dismiss() {
    writePwaDismissedAt();
    setOpen(false);
  }

  return (
    <aside
      role="dialog"
      aria-label="Install Show Desk"
      className="sss-paper fixed inset-x-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-[60] max-w-lg space-y-3 p-4 shadow-sss-overlay sm:inset-x-auto sm:right-4 sm:left-auto sm:w-[24rem]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="sss-eyebrow">Install app</p>
          <h2 className="font-[family-name:var(--font-fraunces)] text-lg font-semibold">
            Add Show Desk to the home screen
          </h2>
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Dismiss install prompt"
          onClick={dismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      {kind === "native" ? (
        <>
          <p className="text-sm text-sss-text-secondary">
            Install for a full-screen ringside app, home-screen icon, and faster
            reopen on this phone.
          </p>
          <Button disabled={busy} onClick={() => void install()}>
            <Download className="h-4 w-4" />
            {busy ? "Installing…" : "Install Show Desk"}
          </Button>
        </>
      ) : kind === "ios" ? (
        <ol className="list-decimal space-y-1 pl-5 text-sm text-sss-text-secondary">
          <li>
            Tap <Share className="inline h-3.5 w-3.5" aria-hidden /> Share
          </li>
          <li>Choose Add to Home Screen</li>
          <li>Tap Add</li>
        </ol>
      ) : (
        <p className="text-sm text-sss-text-secondary">
          Use the browser menu and choose Install app or Add to Home screen.
        </p>
      )}
      <button
        type="button"
        className="text-xs text-sss-text-muted underline-offset-2 hover:underline"
        onClick={dismiss}
      >
        Not now
      </button>
    </aside>
  );
}

export function openPwaInstallPrompt() {
  window.dispatchEvent(new Event("sss:open-pwa-install"));
}
