import Link from "next/link";
import { Button } from "@/components/ui/button";

const COPY = {
  "no-show": {
    title: "No show yet",
    body: "Create a show, then import the roster.",
    href: null,
    cta: null,
  },
  "no-show-steward": {
    title: "No active show",
    body: "Ask the secretary to create or select a show.",
    href: null,
    cta: null,
  },
  unauthorized: {
    title: "Sign in again",
    body: "Your session expired.",
    href: "/login",
    cta: "Sign in",
  },
  "no-entries": {
    title: "Roster is empty",
    body: "Import a CSV or add a scratch entry.",
    href: "/admin/entries",
    cta: "Open roster",
  },
  "no-entries-steward": {
    title: "No dogs in this class",
    body: "Ask the secretary to import the roster.",
    href: null,
    cta: null,
  },
  "no-queue": {
    title: "Nothing to review",
    body: "Record a critique or complete an SE form ringside.",
    href: "/ringside",
    cta: "Open ringside",
  },
  "select-judge": {
    title: "Select a judge",
    body: "Pick the judge in the header before you record or complete an SE.",
    href: null,
    cta: null,
  },
  "no-selection": {
    title: "Select a critique",
    body: "Pick an item from the queue to review the draft.",
    href: null,
    cta: null,
  },
} as const;

export function EmptyDesk({
  variant,
}: {
  variant: keyof typeof COPY;
}) {
  const copy = COPY[variant];
  return (
    <div className="sss-tray space-y-3 p-5">
      <h2 className="font-[family-name:var(--font-fraunces)] text-lg font-semibold">
        {copy.title}
      </h2>
      <p className="text-sm text-sss-text-secondary">{copy.body}</p>
      {copy.href && copy.cta ? (
        <Button asChild>
          <Link href={copy.href}>{copy.cta}</Link>
        </Button>
      ) : null}
    </div>
  );
}
