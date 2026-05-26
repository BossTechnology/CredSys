"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { assignEvaluator } from "@/app/actions/accreditation";

interface AssignEvaluatorFormProps {
  requestId: string;
  evaluators: { user_id: string; org_name: string }[];
}

export function AssignEvaluatorForm({ requestId, evaluators }: AssignEvaluatorFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleAssign(formData: FormData) {
    setLoading(true);
    await assignEvaluator(formData);
    setLoading(false);
    setOpen(false);
  }

  if (!open) {
    return (
      <Button
        variant="danger"
        size="sm"
        onClick={() => setOpen(true)}
      >
        Assign Now
      </Button>
    );
  }

  return (
    <form action={handleAssign} className="flex items-center gap-2">
      <input type="hidden" name="request_id" value={requestId} />
      <select
        name="evaluator_id"
        required
        className="h-[22px] px-2 text-[8px] font-mono border border-cs-200 bg-white rounded-none outline-none"
      >
        <option value="">Select evaluator...</option>
        {evaluators.map((ev) => (
          <option key={ev.user_id} value={ev.user_id}>
            {ev.org_name}
          </option>
        ))}
      </select>
      <Button type="submit" size="sm" loading={loading}>Assign</Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>✕</Button>
    </form>
  );
}
