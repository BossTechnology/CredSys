"use client";

import { useFormStatus } from "react-dom";

interface SubmitButtonProps {
  label:     string;
  className: string;
}

export function SubmitButton({ label, className }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`${className} ${pending ? "opacity-40 cursor-wait" : ""}`}
    >
      {pending ? "…" : label}
    </button>
  );
}
