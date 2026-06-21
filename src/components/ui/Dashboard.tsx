import { cn } from "@/lib/utils";

// Stat Card — 62px standard height
interface StatCardProps {
  value: number | string;
  label: string;
  alert?: boolean;
  alertText?: string;
  href?: string;
  accent?: boolean;
}

export function StatCard({ value, label, alert, alertText, accent }: StatCardProps) {
  return (
    <div
      className={cn(
        "border-l-4 pl-3 pr-4 py-2 min-h-[62px] flex flex-col justify-between",
        alert
          ? "border-cs-red bg-white"
          : accent
          ? "border-sb-default bg-sb-light"
          : "border-cs-200 bg-white"
      )}
    >
      <span
        className={cn(
          "text-4xl font-bold leading-none",
          accent ? "text-sb-text" : "text-black"
        )}
      >
        {value}
      </span>
      <div>
        <span className="text-[13px] font-mono text-cs-500 uppercase tracking-widest block">
          {label}
        </span>
        {alert && alertText && (
          <span className="text-[14px] font-mono text-cs-red uppercase tracking-widest font-semibold">
            {alertText}
          </span>
        )}
      </div>
    </div>
  );
}

interface StatGridProps {
  cols?: 3 | 4 | 5;
  children: React.ReactNode;
}

export function StatGrid({ cols = 4, children }: StatGridProps) {
  return (
    <div
      className={cn(
        "grid gap-px bg-cs-200",
        cols === 3 && "grid-cols-3",
        cols === 4 && "grid-cols-4",
        cols === 5 && "grid-cols-5"
      )}
    >
      {children}
    </div>
  );
}

// KBR Card — Key Business Results (70px standard)
interface KBRCardProps {
  title: string;
  metric: string;
  metricLabel: string;
  objective: string;
  objectiveLabel: string;
  variant?: "default" | "accent" | "alert";
}

export function KBRCard({
  title,
  metric,
  metricLabel,
  objective,
  objectiveLabel,
  variant = "default",
}: KBRCardProps) {
  const borderColor =
    variant === "accent"
      ? "border-sb-default"
      : variant === "alert"
      ? "border-cs-red"
      : "border-cs-200";

  return (
    <div className={cn("border-l-4 px-4 py-3 bg-white min-h-[70px]", borderColor)}>
      <div
        className={cn(
          "text-[13px] font-mono font-semibold uppercase tracking-widest mb-2",
          variant === "accent"
            ? "text-sb-text"
            : variant === "alert"
            ? "text-cs-red"
            : "text-black"
        )}
      >
        {title}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-[14px] font-mono text-cs-400 uppercase tracking-widest">
            {metricLabel}
          </div>
          <div className="text-[13px] font-semibold">{metric}</div>
        </div>
        <div>
          <div className="text-[14px] font-mono text-cs-400 uppercase tracking-widest">
            {objectiveLabel}
          </div>
          <div
            className={cn(
              "text-[13px] font-semibold",
              variant === "accent"
                ? "text-sb-text"
                : variant === "alert"
                ? "text-cs-red"
                : "text-cs-800"
            )}
          >
            {objective}
          </div>
        </div>
      </div>
    </div>
  );
}

// Quick Action Card
interface QuickActionProps {
  title: string;
  desc: string;
  href: string;
  accent?: boolean;
  alert?: boolean;
}

export function QuickAction({ title, desc, href, accent, alert }: QuickActionProps) {
  return (
    <a
      href={href}
      className={cn(
        "block border px-4 py-3 hover:opacity-80 transition-opacity",
        alert
          ? "border-cs-red bg-cs-red-100"
          : accent
          ? "border-sb-default bg-sb-light"
          : "border-cs-200 bg-white"
      )}
    >
      <div
        className={cn(
          "text-[13px] font-mono font-semibold uppercase tracking-widest",
          alert ? "text-cs-red" : accent ? "text-sb-text" : "text-black"
        )}
      >
        {title}
      </div>
      <div className="text-[12px] text-cs-500 mt-1">{desc}</div>
    </a>
  );
}
