import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeStatusVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        available: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
        development: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
        "coming-soon": "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
      },
    },
    defaultVariants: {
      variant: "available",
    },
  }
);

export interface BadgeStatusProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeStatusVariants> {}

function BadgeStatus({ className, variant, ...props }: BadgeStatusProps) {
  return (
    <div className={cn(badgeStatusVariants({ variant }), className)} {...props} />
  );
}

export { BadgeStatus, badgeStatusVariants };
