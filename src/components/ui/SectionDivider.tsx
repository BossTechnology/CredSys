import { cn } from "@/lib/utils";

type DividerVariant = "black" | "accent" | "alert";

const variantStyles: Record<DividerVariant, string> = {
  black: "bg-black text-white",
  accent: "bg-sb-default text-sb-text",
  alert: "bg-cs-red-100 text-cs-red border-l-4 border-cs-red",
};

interface SectionDividerProps {
  label: string;
  count?: number | string;
  variant?: DividerVariant;
  className?: string;
}

export function SectionDivider({
  label,
  count,
  variant = "black",
  className,
}: SectionDividerProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-1 text-[8px] font-mono uppercase tracking-widest",
        variantStyles[variant],
        className
      )}
    >
      <span className="font-semibold">{label}</span>
      {count !== undefined && (
        <span className="opacity-60">{count}</span>
      )}
    </div>
  );
}

interface MetricStripProps {
  items: { value: number | string; label: string; alert?: boolean }[];
}

export function MetricStrip({ items }: MetricStripProps) {
  return (
    <div className="bg-white border border-cs-200 px-4 py-2 flex items-center gap-6">
      {items.map((item, i) => (
        <span key={i} className="text-[8px] font-mono flex items-center gap-1">
          <span className={cn("font-bold text-[10px]", item.alert ? "text-cs-red" : "text-black")}>
            {item.value}
          </span>
          <span className="text-cs-400 uppercase tracking-widest">{item.label}</span>
        </span>
      ))}
    </div>
  );
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  metrics?: { value: number | string; label: string }[];
}

export function PageHeader({ title, subtitle, metrics }: PageHeaderProps) {
  return (
    <div className="border-b border-cs-200 pb-0">
      <div className="px-7 py-4">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-[8px] font-mono text-cs-400 uppercase tracking-widest mt-1">
            {subtitle}
          </p>
        )}
      </div>
      {metrics && <MetricStrip items={metrics} />}
    </div>
  );
}

// =============================================
// ProfileCard — org info summary strip
// =============================================

interface ProfileCardItem {
  label: string;
  value?: string | number | null;
}

interface ProfileCardProps {
  items:      ProfileCardItem[];
  className?: string;
}

export function ProfileCard({ items, className }: ProfileCardProps) {
  return (
    <div
      className={cn(
        "border border-cs-200 bg-white px-4 py-3 flex flex-wrap gap-x-8 gap-y-2",
        className
      )}
    >
      {items.map((item) =>
        item.value != null ? (
          <div key={item.label}>
            <div className="text-[6.5px] font-mono text-cs-400 uppercase tracking-widest">
              {item.label}
            </div>
            <div className="text-[8.5px] font-semibold mt-0.5">{item.value}</div>
          </div>
        ) : null
      )}
    </div>
  );
}
