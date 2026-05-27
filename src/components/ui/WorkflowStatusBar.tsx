import { cn } from "@/lib/utils";
import type { AccreditationStatus } from "@/lib/supabase/types";

const STAGES: { key: AccreditationStatus; label: string; step: number }[] = [
  { key: "pending_evaluator_assignment", label: "Pending",        step: 1 },
  { key: "evaluator_assigned",           label: "Assigned",       step: 2 },
  { key: "meeting_scheduled",            label: "Meeting",        step: 3 },
  { key: "chass1s_shared",               label: "CHASS1S",        step: 4 },
  { key: "implementation_in_progress",   label: "Implementing",   step: 5 },
  { key: "ready_for_verification",       label: "Ready",          step: 6 },
  { key: "verification_in_progress",     label: "Verifying",      step: 7 },
  { key: "accredited",                   label: "Accredited",     step: 8 },
];

const statusToStep: Partial<Record<AccreditationStatus, number>> = {
  pending_evaluator_assignment: 1,
  evaluator_assigned:           2,
  meeting_scheduled:            3,
  chass1s_shared:               4,
  implementation_in_progress:   5,
  ready_for_verification:       6,
  verification_in_progress:     7,
  accredited:                   8,
  rejected:                     0,
  expired:                      0,
};

interface WorkflowStatusBarProps {
  currentStatus: AccreditationStatus;
  className?: string;
}

export function WorkflowStatusBar({ currentStatus, className }: WorkflowStatusBarProps) {
  const currentStep = statusToStep[currentStatus] ?? 0;
  const isTerminal   = currentStatus === "rejected" || currentStatus === "expired";

  if (isTerminal) {
    return (
      <div
        className={cn(
          "border px-6 py-3 flex items-center gap-3",
          currentStatus === "rejected"
            ? "border-cs-red bg-cs-red-100"
            : "border-cs-200 bg-cs-50",
          className
        )}
      >
        <span
          className={cn(
            "text-[8px] font-mono uppercase tracking-widest font-semibold",
            currentStatus === "rejected" ? "text-cs-red" : "text-cs-500"
          )}
        >
          {currentStatus === "rejected" ? "Rejected" : "Expired"}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "border border-cs-200 px-4 py-3 flex items-center bg-white overflow-x-auto",
        className
      )}
    >
      {STAGES.map((stage, i) => {
        const done   = stage.step < currentStep;
        const active = stage.step === currentStep;
        const future = stage.step > currentStep;

        return (
          <div key={stage.key} className="flex items-center flex-shrink-0">
            <div className="flex flex-col items-center gap-1 min-w-[56px]">
              <div
                className={cn(
                  "w-6 h-6 flex items-center justify-center text-[7px] font-mono font-bold",
                  done   && "bg-black text-white",
                  active && "bg-black text-white ring-2 ring-offset-1 ring-black",
                  future && "bg-cs-200 text-cs-500"
                )}
              >
                {done ? "✓" : stage.step}
              </div>
              <span
                className={cn(
                  "text-[6px] font-mono uppercase tracking-widest text-center whitespace-nowrap",
                  active ? "text-black font-bold" : done ? "text-cs-600" : "text-cs-400"
                )}
              >
                {stage.label}
              </span>
            </div>
            {/* connector */}
            {i < STAGES.length - 1 && (
              <div
                className={cn(
                  "h-px w-4 flex-shrink-0 mx-0.5 mb-3",
                  stage.step < currentStep ? "bg-black" : "bg-cs-200"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
