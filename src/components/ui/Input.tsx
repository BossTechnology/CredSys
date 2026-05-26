import { cn } from "@/lib/utils";
import React from "react";

type InputVariant = "standard" | "cream" | "accent" | "error";

const variantStyles: Record<InputVariant, string> = {
  standard: "bg-white border-cs-200 focus:border-black focus:ring-0",
  cream: "bg-cs-cream border-cs-cream-border focus:border-cs-600 focus:ring-0",
  accent: "bg-sb-light border-sb-default focus:border-sb-text focus:ring-0",
  error: "bg-white border-cs-red focus:border-cs-red focus:ring-0",
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: InputVariant;
  label?: string;
  error?: string;
}

export function Input({
  variant = "standard",
  label,
  error,
  className,
  id,
  ...props
}: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  const activeVariant = error ? "error" : variant;

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={inputId}
          className="text-[6.5px] font-mono uppercase tracking-widest text-cs-500"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        {...props}
        className={cn(
          "h-[18px] px-2 text-[8px] font-body border rounded-none outline-none transition-colors",
          "placeholder:text-cs-400",
          "disabled:bg-cs-100 disabled:text-cs-400 disabled:border-cs-200",
          variantStyles[activeVariant],
          className
        )}
      />
      {error && (
        <span className="text-[7px] font-mono text-cs-red">{error}</span>
      )}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: InputVariant;
  label?: string;
  error?: string;
}

export function Textarea({
  variant = "standard",
  label,
  error,
  className,
  id,
  ...props
}: TextareaProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  const activeVariant = error ? "error" : variant;

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={inputId}
          className="text-[6.5px] font-mono uppercase tracking-widest text-cs-500"
        >
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        {...props}
        className={cn(
          "px-2 py-1 text-[8px] font-body border rounded-none outline-none transition-colors resize-y min-h-[60px]",
          "placeholder:text-cs-400",
          variantStyles[activeVariant],
          className
        )}
      />
      {error && (
        <span className="text-[7px] font-mono text-cs-red">{error}</span>
      )}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  variant?: InputVariant;
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function Select({
  variant = "standard",
  label,
  error,
  options,
  placeholder,
  className,
  id,
  ...props
}: SelectProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  const activeVariant = error ? "error" : variant;

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={inputId}
          className="text-[6.5px] font-mono uppercase tracking-widest text-cs-500"
        >
          {label}
        </label>
      )}
      <select
        id={inputId}
        {...props}
        className={cn(
          "h-[18px] px-2 text-[8px] font-body border rounded-none outline-none transition-colors appearance-none cursor-pointer",
          variantStyles[activeVariant],
          className
        )}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <span className="text-[7px] font-mono text-cs-red">{error}</span>
      )}
    </div>
  );
}
