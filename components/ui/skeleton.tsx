import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("sss-skeleton", className)} aria-hidden />;
}
