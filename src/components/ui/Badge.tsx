import { cn } from "@/lib/utils";
import type { AccreditationStatus } from "@/lib/supabase/types";

type BadgeVariant =
  | AccreditationStatus
  | "active"
  | "controlled"
  | "uncontrolled"
  | "edit_mode"
  | "pending";

const variantStyles: Record<BadgeVariant, string> = {
  accredited: "bg-sb-default text-sb-text",
  active: "bg-black text-white",
  implementing: "bg-black text-white",
  assigned: "bg-black text-white",
  interview: "bg-black text-white",
  verifying: "bg-black text-white",
  controlled: "bg-black text-white",
  draft: "bg-cs-200 text-cs-600",
  submitted: "bg-cs-200 text-cs-600",
  pending: "bg-cs-200 text-cs-600",
  uncontrolled: "bg-cs-red text-white",
  rejected: "bg-cs-red text-white",
  expired: "bg-cs-red text-white",
  edit_mode: "bg-cs-cream border border-cs-cream-border text-cs-700",
};

const variantLabels: Record<BadgeVariant, string> = {
  accredited: "✓ ACCREDITED",
  active: "ACTIVE",
  implementing: "IMPLEMENTING",
  assigned: "ASSIGNED",
  interview: "INTERVIEW",
  verifying: "VERIFYING",
  controlled: "CONTROLLED",
  draft: "DRAFT",
  submitted: "SUBMITTED",
  pending: "PENDING",
  uncontrolled: "UNCONTROLLED",
  rejected: "REJECTED",
  expired: "EXPIRED",
  edit_mode: "EDIT MODE",
};

interface BadgeProps {
  variant: BadgeVariant;
  className?: string;
  children?: React.ReactNode;
}

export function Badge({ variant, className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-[6.5px] font-mono font-semibold uppercase tracking-wider rounded-sm",
        variantStyles[variant],
        className
      )}
    >
      {children ?? variantLabels[variant]}
    </span>
  );
}
