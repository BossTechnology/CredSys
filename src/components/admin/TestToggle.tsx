"use client";

import { toggleEntityTest } from "@/app/actions/admin";
import { useFormStatus } from "react-dom";

interface TestToggleProps {
  table:        "startups" | "accelerators" | "evaluators" | "investors" | "competitions";
  entityId:     string;
  isTest:       boolean;
  markLabel:    string;
  unmarkLabel:  string;
}

function ToggleBtn({ isTest, markLabel, unmarkLabel }: { isTest: boolean; markLabel: string; unmarkLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`text-[10px] font-mono uppercase tracking-widest transition-colors ${
        pending
          ? "text-cs-300 cursor-wait"
          : isTest
            ? "text-red-500 hover:text-red-700"
            : "text-cs-400 hover:text-black"
      }`}
    >
      {pending ? "…" : isTest ? unmarkLabel : markLabel}
    </button>
  );
}

export function TestToggle({ table, entityId, isTest, markLabel, unmarkLabel }: TestToggleProps) {
  return (
    <form action={toggleEntityTest}>
      <input type="hidden" name="table" value={table} />
      <input type="hidden" name="entity_id" value={entityId} />
      <input type="hidden" name="make_test" value={isTest ? "false" : "true"} />
      <ToggleBtn isTest={isTest} markLabel={markLabel} unmarkLabel={unmarkLabel} />
    </form>
  );
}
