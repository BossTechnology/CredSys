import { cn } from "@/lib/utils";
import React from "react";

type ButtonVariant = "primary" | "outline" | "ghost" | "danger" | "accent";
type ButtonSize = "sm" | "md" | "lg";

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-black text-white hover:bg-cs-800 border border-black",
  outline: "bg-white text-black border border-black hover:bg-cs-50",
  ghost: "bg-transparent text-cs-500 border border-cs-300 hover:bg-cs-50",
  danger: "bg-cs-red text-white border border-cs-red hover:bg-cs-red-dark",
  accent: "bg-sb-default text-sb-text border border-sb-default hover:bg-sb-medium",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-[14px] py-[5px] text-[13px] h-[22px]",
  md: "px-5 py-[7px] text-[13px] h-[22px]",
  lg: "px-7 py-3 text-[13px] h-auto",
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-mono font-semibold uppercase tracking-wider rounded-none transition-colors cursor-pointer",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {loading ? "..." : children}
    </button>
  );
}
