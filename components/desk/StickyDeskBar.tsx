import { Button } from "@/components/ui/button";

export function StickyDeskBar({
  primaryLabel,
  primaryDisabled,
  onPrimary,
  primaryHref,
  secondary,
}: {
  primaryLabel: string;
  primaryDisabled?: boolean;
  onPrimary?: () => void;
  primaryHref?: string;
  secondary?: React.ReactNode;
}) {
  return (
    <div className="sss-paper mt-4 flex flex-wrap items-center gap-2 p-3">
      {secondary}
      {primaryHref ? (
        <Button asChild disabled={primaryDisabled}>
          <a href={primaryHref}>{primaryLabel}</a>
        </Button>
      ) : (
        <Button
          type="button"
          disabled={primaryDisabled}
          onClick={onPrimary}
        >
          {primaryLabel}
        </Button>
      )}
    </div>
  );
}
