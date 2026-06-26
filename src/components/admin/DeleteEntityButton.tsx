"use client";

import { useState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

type ServerAction = (formData: FormData) => void | Promise<void>;

interface DeleteEntityButtonProps {
  action:       ServerAction;
  entityId:     string;
  label:        string;
  confirmLabel: string;
}

function SubmitBtn({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`text-[10px] font-mono uppercase tracking-widest transition-colors ${
        pending
          ? "text-red-300 cursor-wait"
          : "text-red-600 hover:text-red-800"
      }`}
    >
      {pending ? "…" : label}
    </button>
  );
}

export function DeleteEntityButton({ action, entityId, label, confirmLabel }: DeleteEntityButtonProps) {
  const [armed, setArmed] = useState(false);
  const prevEntityId = useRef(entityId);

  useEffect(() => {
    if (prevEntityId.current !== entityId) {
      setArmed(false);
      prevEntityId.current = entityId;
    }
  }, [entityId]);

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(timer);
  }, [armed]);

  return (
    <form action={action}>
      <input type="hidden" name="entity_id" value={entityId} />
      {armed ? (
        <SubmitBtn label={confirmLabel} />
      ) : (
        <button
          type="button"
          onClick={() => setArmed(true)}
          className="text-[10px] font-mono uppercase tracking-widest text-cs-400 hover:text-red-500 transition-colors"
        >
          {label}
        </button>
      )}
    </form>
  );
}
