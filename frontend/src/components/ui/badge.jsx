import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[#7c3aed] text-white hover:bg-[#7c3aed]/80",
        secondary: "border-transparent bg-[var(--ds-input-bg)] text-[var(--ds-text-normal)] hover:bg-[var(--ds-input-bg)]/80",
        destructive: "border-transparent bg-[#f23f43] text-white hover:bg-[#f23f43]/80",
        outline: "border-[var(--ds-border)] text-[var(--ds-text-normal)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
