"use client";

import { useState, useEffect, useActionState } from "react";
import { useFormStatus } from "react-dom";

type RevertAction = (prev: { error?: string }, formData: FormData) => Promise<{ error?: string }>;

interface RevertStatusButtonProps {
  action:       RevertAction;
  requestId:    string;
  label:        string;
  confirmLabel: string;
}

function SubmitBtn({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`text-[11px] font-mono uppercase tracking-widest transition-colors ${
        pending ? "text-amber-300 cursor-wait" : "text-amber-600 hover:text-amber-800"
      }`}
    >
      {pending ? "…" : label}
    </button>
  );
}

export function RevertStatusButton({ action, requestId, label, confirmLabel }: RevertStatusButtonProps) {
  const [armed, setArmed] = useState(false);
  const [state, formAction] = useActionState(action, {} as { error?: string });

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(timer);
  }, [armed]);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="request_id" value={requestId} />
      {armed ? (
        <SubmitBtn label={confirmLabel} />
      ) : (
        <button
          type="button"
          onClick={() => setArmed(true)}
          className="text-[11px] font-mono uppercase tracking-widest text-cs-400 hover:text-amber-700 transition-colors"
        >
          {label}
        </button>
      )}
      {state?.error && (
        <span className="text-[11px] font-mono text-red-600">{state.error}</span>
      )}
    </form>
  );
}
