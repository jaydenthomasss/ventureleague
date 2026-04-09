import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-[#E8A045]/30 bg-[#E8A045]/10 text-[#E8A045]",
        secondary:
          "border-[#4A9EFF]/30 bg-[#4A9EFF]/10 text-[#4A9EFF]",
        success:
          "border-green-500/30 bg-green-500/10 text-green-400",
        warning:
          "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
        destructive:
          "border-red-500/30 bg-red-500/10 text-red-400",
        outline:
          "border-[#2a2a2a] bg-transparent text-gray-300",
        muted:
          "border-[#2a2a2a] bg-[#1a1a1a] text-gray-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
