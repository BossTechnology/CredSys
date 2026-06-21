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
  // New spec statuses
  pending_evaluator_assignment: "bg-cs-100 text-cs-600",
  evaluator_assigned:           "bg-black text-white",
  meeting_scheduled:            "bg-black text-white",
  chass1s_shared:               "bg-black text-white",
  implementation_in_progress:   "bg-black text-white",
  ready_for_verification:       "bg-sb-light text-sb-text",
  verification_in_progress:     "bg-sb-light text-sb-text",
  accredited:                   "bg-sb-default text-sb-text",
  rejected:                     "bg-cs-red text-white",
  expired:                      "bg-cs-150 text-cs-500",
  // Generic variants
  active:       "bg-black text-white",
  pending:      "bg-cs-100 text-cs-600",
  controlled:   "bg-black text-white",
  uncontrolled: "bg-cs-red text-white",
  edit_mode:    "bg-cs-cream border border-cs-cream-border text-cs-700",
};

const variantLabels: Record<BadgeVariant, string> = {
  pending_evaluator_assignment: "Pending",
  evaluator_assigned:           "Assigned",
  meeting_scheduled:            "Meeting",
  chass1s_shared:               "CHASS1S",
  implementation_in_progress:   "Implementing",
  ready_for_verification:       "Ready",
  verification_in_progress:     "Verifying",
  accredited:                   "✓ Accredited",
  rejected:                     "Rejected",
  expired:                      "Expired",
  active:       "Active",
  pending:      "Pending",
  controlled:   "Controlled",
  uncontrolled: "Uncontrolled",
  edit_mode:    "Edit Mode",
};

interface BadgeProps {
  variant:    BadgeVariant;
  className?: string;
  children?:  React.ReactNode;
}

export function Badge({ variant, className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-[14px] font-mono font-semibold uppercase tracking-wider",
        variantStyles[variant],
        className
      )}
    >
      {children ?? variantLabels[variant]}
    </span>
  );
}
