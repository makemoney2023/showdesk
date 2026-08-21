import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sss-md text-sm font-medium transition-[color,background-color,box-shadow,transform] duration-[var(--duration-ui)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 active:translate-y-px",
  {
    variants: {
      variant: {
        default:
          "bg-sss-accent text-sss-ink shadow-sss-card hover:bg-sss-accent-deep hover:text-[var(--sss-paper)]",
        outline:
          "border border-sss-border bg-sss-elevated text-sss-text-primary hover:bg-sss-lifted hover:border-sss-accent-soft",
        ghost: "text-sss-accent-deep hover:bg-sss-lifted",
        destructive: "bg-sss-error text-white shadow-sss-card hover:bg-sss-error/90",
        link: "text-sss-accent-deep underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 min-h-11 px-4 py-2",
        sm: "h-9 min-h-9 px-3",
        lg: "h-12 min-h-12 px-6 text-base",
        icon: "h-11 w-11 min-h-11 min-w-11 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />
  );
}

export { Button, buttonVariants };
