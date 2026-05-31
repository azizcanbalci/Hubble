import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[60px] w-full rounded-md border border-[var(--ds-border)] bg-[var(--ds-input-bg)] px-3 py-2 text-sm text-[var(--ds-text-normal)] shadow-sm placeholder:text-[var(--ds-text-muted)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ds-accent)] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
