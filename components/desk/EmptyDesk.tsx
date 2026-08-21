import Link from "next/link";
import {
  AlertCircle,
  ClipboardList,
  Gavel,
  LayoutDashboard,
  LogIn,
  Mic,
  PawPrint,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/feedback/EmptyState";

const COPY = {
  "no-show": {
    title: "No show yet",
    body: "Create a show, then import the roster.",
    href: null,
    cta: null,
    icon: LayoutDashboard,
  },
  "no-show-steward": {
    title: "No active show",
    body: "Ask the secretary to create or select a show.",
    href: null,
    cta: null,
    icon: LayoutDashboard,
  },
  unauthorized: {
    title: "Sign in again",
    body: "Your session expired.",
    href: "/login",
    cta: "Sign in",
    icon: LogIn,
  },
  "no-entries": {
    title: "Roster is empty",
    body: "Import a CSV or add a scratch entry.",
    href: "/admin/entries",
    cta: "Open roster",
    icon: ClipboardList,
  },
  "no-entries-steward": {
    title: "No dogs in this class",
    body: "Ask the secretary to import the roster.",
    href: null,
    cta: null,
    icon: PawPrint,
  },
  "no-queue": {
    title: "Nothing to review",
    body: "Record a critique or complete an SE form ringside.",
    href: "/ringside",
    cta: "Open ringside",
    icon: Search,
  },
  "select-judge": {
    title: "Select a judge",
    body: "Pick the judge in the header before you record or complete an SE.",
    href: null,
    cta: null,
    icon: Gavel,
  },
  "no-entry": {
    title: "Dog not on this show",
    body: "This armband is not on the active roster. Go back and pick another dog.",
    href: "/ringside",
    cta: "Back to dogs",
    icon: AlertCircle,
  },
  "no-selection": {
    title: "Select a critique",
    body: "Pick a dog in the queue — the review editor opens directly beneath it.",
    href: null,
    cta: null,
    icon: Search,
  },
} as const;

export function EmptyDesk({
  variant,
}: {
  variant: keyof typeof COPY;
}) {
  const copy = COPY[variant];
  const Icon = copy.icon;
  return (
    <EmptyState
      icon={<Icon className="h-5 w-5" />}
      title={copy.title}
      body={copy.body}
      action={
        copy.href && copy.cta ? (
          <Button asChild>
            <Link href={copy.href}>
              {copy.href === "/ringside" ? <Mic className="h-4 w-4" /> : null}
              {copy.cta}
            </Link>
          </Button>
        ) : null
      }
    />
  );
}
