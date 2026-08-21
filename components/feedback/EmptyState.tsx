import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sss-tray flex flex-col items-start gap-3 p-6 sm:items-center sm:text-center",
        className,
      )}
    >
      {icon ? (
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-sss bg-sss-elevated text-sss-accent-deep shadow-sss-card">
          {icon}
        </span>
      ) : null}
      <div className="space-y-1">
        <h2 className="font-[family-name:var(--font-fraunces)] text-lg font-semibold">
          {title}
        </h2>
        {body ? (
          <p className="max-w-md text-sm text-sss-text-secondary">{body}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
