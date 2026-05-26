import { cn } from "@/lib/utils";
import type { AccreditationStatus } from "@/lib/supabase/types";

const STAGES: { key: AccreditationStatus; label: string; step: number }[] = [
  { key: "assigned", label: "Assigned", step: 1 },
  { key: "interview", label: "Interview", step: 2 },
  { key: "implementing", label: "Implementing", step: 3 },
  { key: "verifying", label: "Verifying", step: 4 },
  { key: "accredited", label: "Accredited", step: 5 },
];

const statusToStep: Partial<Record<AccreditationStatus, number>> = {
  assigned: 1,
  interview: 2,
  implementing: 3,
  verifying: 4,
  accredited: 5,
};

interface WorkflowStatusBarProps {
  currentStatus: AccreditationStatus;
  className?: string;
}

export function WorkflowStatusBar({ currentStatus, className }: WorkflowStatusBarProps) {
  const currentStep = statusToStep[currentStatus] ?? 0;

  return (
    <div
      className={cn(
        "border border-cs-200 px-6 py-3 flex items-center justify-between bg-white",
        className
      )}
    >
      {STAGES.map((stage, i) => {
        const done = stage.step < currentStep;
        const active = stage.step === currentStep;
        const future = stage.step > currentStep;

        return (
          <div key={stage.key} className="flex flex-col items-center gap-1 flex-1">
            <div
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-[8px] font-mono font-bold",
                done && "bg-black text-white",
                active && "bg-black text-white ring-2 ring-offset-1 ring-black",
                future && "bg-cs-200 text-cs-500"
              )}
            >
              {done ? "✓" : stage.step}
            </div>
            <span
              className={cn(
                "text-[7px] font-mono uppercase tracking-widest",
                active ? "text-black font-bold" : "text-cs-400",
                done && "text-cs-600"
              )}
            >
              {stage.label}
            </span>
            {/* connector line */}
            {i < STAGES.length - 1 && (
              <div className="absolute" />
            )}
          </div>
        );
      })}
    </div>
  );
}
