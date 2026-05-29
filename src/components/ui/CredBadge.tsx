import { cn } from "@/lib/utils";
import { truncate, formatDateShort } from "@/lib/utils";

interface CredBadgeProps {
  startupName: string;
  uniqueCode: string;
  accreditedAt: string;
  domain?: string;
  width?: number;
  className?: string;
}

export function CredBadge({
  startupName,
  uniqueCode,
  accreditedAt,
  domain = "startupboss.org",
  className,
}: CredBadgeProps) {
  const displayName = truncate(startupName, 28);
  const dateStr = formatDateShort(accreditedAt);

  return (
    <div
      className={cn(
        "bg-black text-white flex flex-col justify-between p-4 relative overflow-hidden",
        "w-[320px] h-[130px]",
        className
      )}
    >
      {/* Left accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-sb-default" />

      <div className="pl-3">
        {/* Header */}
        <div className="text-[13px] font-mono text-cs-400 uppercase tracking-widest mb-1">
          StartupCred
        </div>

        {/* Accredited pill */}
        <span className="inline-flex items-center px-2 py-0.5 bg-sb-default text-sb-text text-[10px] font-mono font-semibold uppercase tracking-wider mb-2">
          ACCREDITED
        </span>

        {/* Startup name */}
        <div className="text-lg font-bold leading-tight">{displayName}</div>

        {/* Date */}
        <div className="text-[13px] font-mono text-cs-400 mt-1">{dateStr}</div>
      </div>

      {/* Footer: ID + domain */}
      <div className="pl-3 flex items-end justify-between">
        <div className="text-[14px] font-mono text-cs-500">
          ID: {uniqueCode} · {domain}
        </div>
        {/* Check mark */}
        <div className="text-[#1A1A1A] text-2xl font-bold">✓</div>
      </div>
    </div>
  );
}
