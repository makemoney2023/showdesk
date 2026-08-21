import { cn } from "@/lib/utils";

export function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-sss-accent px-1.5 text-[11px] font-semibold leading-none text-sss-ink",
        className,
      )}
    >
      {children}
    </span>
  );
}
