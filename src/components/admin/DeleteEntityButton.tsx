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
          className="text-[11px] font-mono uppercase tracking-widest px-2 py-1 border border-red-300 bg-red-600 text-white hover:bg-red-700 transition-colors"
        >
          {confirmLabel}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setArmed(true)}
          className="text-[11px] font-mono uppercase tracking-widest px-2 py-1 border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
        >
          {label}
        </button>
      )}
    </form>
  );
}
