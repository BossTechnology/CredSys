"use client";

import { useState } from "react";

type ServerAction = (formData: FormData) => void | Promise<void>;

interface DeleteEntityButtonProps {
  action:       ServerAction;
  entityId:     string;
  label:        string; // e.g. "Delete"
  confirmLabel: string; // e.g. "Confirm delete?"
}

/**
 * Two-step inline confirm: first click arms (reveals the red confirm button),
 * second click submits the delete form.
 */
export function DeleteEntityButton({ action, entityId, label, confirmLabel }: DeleteEntityButtonProps) {
  const [armed, setArmed] = useState(false);

  return (
    <form action={action}>
      <input type="hidden" name="entity_id" value={entityId} />
      {armed ? (
        <button
          type="submit"
          className="text-[10px] font-mono uppercase tracking-widest text-red-600 hover:text-red-800 transition-colors"
        >
          {confirmLabel}
        </button>
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
