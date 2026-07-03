"use client";

import { useState, useEffect } from "react";
import { useFormStatus } from "react-dom";

type ServerAction = (formData: FormData) => void | Promise<void>;

interface ConfirmActionButtonProps {
  action:       ServerAction;
  fields:       Record<string, string>;
  label:        string;
  confirmLabel: string;
  danger?:      boolean;
}

function SubmitBtn({ label, danger }: { label: string; danger: boolean }) {
  const { pending } = useFormStatus();
  const color = danger ? "text-red-600 hover:text-red-800" : "text-amber-600 hover:text-amber-800";
  return (
    <button
      type="submit"
      disabled={pending}
      className={`text-[11px] font-mono uppercase tracking-widest transition-colors ${
        pending ? "opacity-40 cursor-wait" : color
      }`}
    >
      {pending ? "…" : label}
    </button>
  );
}

export function ConfirmActionButton({
  action, fields, label, confirmLabel, danger = false,
}: ConfirmActionButtonProps) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(timer);
  }, [armed]);

  return (
    <form action={action}>
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {armed ? (
        <SubmitBtn label={confirmLabel} danger={danger} />
      ) : (
        <button
          type="button"
          onClick={() => setArmed(true)}
          className={`text-[11px] font-mono uppercase tracking-widest transition-colors ${
            danger ? "text-cs-400 hover:text-red-500" : "text-cs-400 hover:text-amber-700"
          }`}
        >
          {label}
        </button>
      )}
    </form>
  );
}
