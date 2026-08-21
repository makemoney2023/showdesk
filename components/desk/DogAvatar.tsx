import { PawPrint } from "lucide-react";
import { cn } from "@/lib/utils";

export function DogAvatar({
  src,
  alt = "",
  size = "md",
  className,
}: {
  src?: string | null;
  alt?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dim =
    size === "sm" ? "h-8 w-8" : size === "lg" ? "h-16 w-16" : "h-14 w-14";
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={cn(
          dim,
          "shrink-0 rounded-sss-md object-cover ring-1 ring-sss-border",
          className,
        )}
      />
    );
  }
  return (
    <span
      className={cn(
        dim,
        "inline-flex shrink-0 items-center justify-center rounded-sss-md bg-sss-lifted text-sss-text-muted ring-1 ring-sss-border",
        className,
      )}
      aria-hidden
    >
      <PawPrint className={size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5"} />
    </span>
  );
}
