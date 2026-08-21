import * as React from "react";
import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "flex min-h-[100px] w-full rounded-sss-md border border-sss-border bg-sss-elevated px-3 py-2 text-sm text-sss-text-primary placeholder:text-sss-text-muted transition-colors duration-[var(--duration-ui)] hover:border-sss-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
