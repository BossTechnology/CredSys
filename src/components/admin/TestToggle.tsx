"use client";

import { toggleEntityTest } from "@/app/actions/admin";

interface TestToggleProps {
  table:        "startups" | "accelerators" | "evaluators" | "investors" | "competitions";
  entityId:     string;
  isTest:       boolean;
  markLabel:    string;
  unmarkLabel:  string;
}

/** One-click toggle that flips an entity's is_test flag. */
export function TestToggle({ table, entityId, isTest, markLabel, unmarkLabel }: TestToggleProps) {
  return (
    <form action={toggleEntityTest}>
      <input type="hidden" name="table" value={table} />
      <input type="hidden" name="entity_id" value={entityId} />
      <input type="hidden" name="make_test" value={isTest ? "false" : "true"} />
      <button
        type="submit"
        className={`text-[10px] font-mono uppercase tracking-widest transition-colors ${
          isTest
            ? "text-red-500 hover:text-red-700"
            : "text-cs-400 hover:text-black"
        }`}
      >
        {isTest ? unmarkLabel : markLabel}
      </button>
    </form>
  );
}
