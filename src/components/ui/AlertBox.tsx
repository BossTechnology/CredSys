import { cn } from "@/lib/utils";

type AlertVariant = "accent" | "error" | "neutral";

const variantStyles: Record<AlertVariant, string> = {
  accent: "bg-sb-light border border-sb-default text-sb-text",
  error: "bg-cs-red-100 border border-cs-red text-cs-red",
  neutral: "bg-cs-50 border border-cs-200 text-cs-700",
};

interface AlertBoxProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function AlertBox({
  variant = "neutral",
  title,
  children,
  className,
}: AlertBoxProps) {
  return (
    <div
      className={cn(
        "px-4 py-2 text-[13px] font-mono",
        variantStyles[variant],
        className
      )}
    >
      {title && (
        <span className="font-semibold uppercase tracking-widest mr-2">
          {title}
        </span>
      )}
      {children}
    </div>
  );
}
