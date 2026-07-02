"use client";

import { useState } from "react";
import { assignEvaluatorToRequest } from "@/app/actions/admin";
import { SubmitButton } from "@/components/admin/SubmitButton";

interface Evaluator {
  id:       string;
  org_name: string;
}

interface ReassignEvaluatorFieldProps {
  requestId:     string;
  currentName:   string;
  acceptanceStatus?: string;
  evaluators:    Evaluator[];
  labels: {
    reassign:          string;
    reassignBtn:        string;
    cancelReassign:     string;
    select:             string;
    acceptancePending:  string;
    acceptanceAccepted: string;
  };
}

export function ReassignEvaluatorField({
  requestId, currentName, acceptanceStatus, evaluators, labels,
}: ReassignEvaluatorFieldProps) {
  const [reassigning, setReassigning] = useState(false);

  if (!reassigning) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-[12px] font-mono text-cs-500">{currentName}</span>
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-mono uppercase tracking-widest ${
              acceptanceStatus === "accepted" ? "text-green-700" : "text-yellow-600"
            }`}
          >
            {acceptanceStatus === "accepted" ? labels.acceptanceAccepted : labels.acceptancePending}
          </span>
          <button
            type="button"
            onClick={() => setReassigning(true)}
            className="text-[10px] font-mono uppercase tracking-widest text-cs-400 hover:text-black"
          >
            {labels.reassign}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      action={assignEvaluatorToRequest}
      className="flex flex-col gap-1"
      onSubmit={() => setReassigning(false)}
    >
      <input type="hidden" name="request_id" value={requestId} />
      <div className="flex gap-1.5 items-center">
        <select
          name="evaluator_id"
          required
          className="text-[12px] font-mono border border-cs-200 bg-white px-1.5 py-1 focus:outline-none focus:border-black flex-1 min-w-0"
        >
          <option value="">{labels.select}</option>
          {evaluators.map((e) => (
            <option key={e.id} value={e.id}>{e.org_name}</option>
          ))}
        </select>
        <SubmitButton
          label={labels.reassignBtn}
          className="btn-primary btn-sm shrink-0"
        />
        <button
          type="button"
          onClick={() => setReassigning(false)}
          className="text-[10px] font-mono uppercase tracking-widest text-cs-400 hover:text-black shrink-0"
        >
          {labels.cancelReassign}
        </button>
      </div>
    </form>
  );
}
