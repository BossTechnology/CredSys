"use client";

import { useState } from "react";
import { useActionState } from "react";
import { updateEntityEmail } from "@/app/actions/admin";

interface EditEmailFieldProps {
  table:    "startups" | "investors";
  entityId: string;
  email:    string;
  editLabel:   string; // e.g. "Edit"
  saveLabel:   string; // e.g. "Save"
  cancelLabel: string; // e.g. "Cancel"
}

/**
 * Inline-editable email. Shows the email with an "Edit" affordance; editing
 * reveals an input + Save/Cancel and posts to updateEntityEmail (which syncs
 * the entity record, the login, and any pending setup token).
 */
export function EditEmailField({
  table, entityId, email, editLabel, saveLabel, cancelLabel,
}: EditEmailFieldProps) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(updateEntityEmail, {} as { error?: string; ok?: boolean });

  if (!editing) {
    return (
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[12px] font-mono text-cs-400 truncate">{email}</span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-[10px] font-mono uppercase tracking-widest text-cs-400 hover:text-black shrink-0"
        >
          {editLabel}
        </button>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-1"
      onSubmit={() => setEditing(true)}
    >
      <input type="hidden" name="table" value={table} />
      <input type="hidden" name="entity_id" value={entityId} />
      <div className="flex items-center gap-1.5">
        <input
          name="new_email"
          type="email"
          defaultValue={email}
          required
          className="text-[12px] font-mono border border-cs-200 bg-white px-1.5 py-1 focus:outline-none focus:border-black flex-1 min-w-0"
        />
        <button type="submit" disabled={pending} className={`btn-primary btn-sm shrink-0 ${pending ? "opacity-40 cursor-wait" : ""}`}>
          {pending ? "…" : saveLabel}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-[10px] font-mono uppercase tracking-widest text-cs-400 hover:text-black shrink-0"
        >
          {cancelLabel}
        </button>
      </div>
      {state?.error && (
        <span className="text-[10px] font-mono text-red-600">{state.error}</span>
      )}
    </form>
  );
}
