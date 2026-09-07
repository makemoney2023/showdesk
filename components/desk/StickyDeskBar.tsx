import { Button } from "@/components/ui/button";

export function StickyDeskBar({
  primaryLabel,
  primaryDisabled,
  onPrimary,
  primaryHref,
  primaryTarget,
  secondary,
}: {
  primaryLabel: string;
  primaryDisabled?: boolean;
  onPrimary?: () => void;
  primaryHref?: string;
  primaryTarget?: "_blank";
  secondary?: React.ReactNode;
}) {
  return (
    <div className="sss-paper mt-4 flex flex-wrap items-center gap-2 p-3 shadow-sss-card">
      {secondary}
      {primaryHref ? (
        <Button asChild disabled={primaryDisabled}>
          <a
            href={primaryHref}
            target={primaryTarget}
            rel={primaryTarget === "_blank" ? "noreferrer" : undefined}
          >
            {primaryLabel}
          </a>
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
