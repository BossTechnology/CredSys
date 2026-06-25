"use client";

import { useState } from "react";
import { setTestMode, purgeTestData } from "@/app/actions/admin";

interface TestModeControlProps {
  testMode:     boolean;
  onLabel:      string;
  offLabel:     string;
  turnOnLabel:  string;
  turnOffLabel: string;
  purgeLabel:   string;
  purgeHint:    string;
  purgeConfirm: string;
}

export function TestModeControl({
  testMode, onLabel, offLabel, turnOnLabel, turnOffLabel, purgeLabel, purgeHint, purgeConfirm,
}: TestModeControlProps) {
  const [purging, setPurging] = useState(false);

  return (
    <div className="bg-white border border-cs-200 p-5 mb-6 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <span className={`text-[13px] font-mono font-bold uppercase tracking-widest ${testMode ? "text-red-600" : "text-cs-500"}`}>
          {testMode ? onLabel : offLabel}
        </span>
        <form action={setTestMode}>
          <input type="hidden" name="test_mode" value={testMode ? "off" : "on"} />
          <button
            type="submit"
            className={`text-[11px] font-mono uppercase tracking-widest px-3 py-1.5 border transition-colors ${
              testMode ? "border-cs-300 text-cs-600 hover:bg-cs-50" : "bg-red-600 text-white border-red-600 hover:bg-red-700"
            }`}
          >
            {testMode ? turnOffLabel : turnOnLabel}
          </button>
        </form>
      </div>

      <div className="border-t border-cs-100 pt-4">
        {!purging ? (
          <button
            type="button"
            onClick={() => setPurging(true)}
            className="text-[11px] font-mono uppercase tracking-widest px-3 py-1.5 border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
          >
            {purgeLabel}
          </button>
        ) : (
          <form action={purgeTestData} className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-mono text-cs-500">{purgeHint}</span>
            <input
              name="confirm"
              required
              placeholder="PURGE"
              className="text-[12px] font-mono border border-cs-200 bg-white px-1.5 py-1 focus:outline-none focus:border-black w-24"
            />
            <button type="submit" className="text-[11px] font-mono uppercase tracking-widest px-3 py-1.5 border border-red-300 bg-red-600 text-white hover:bg-red-700">
              {purgeConfirm}
            </button>
            <button
              type="button"
              onClick={() => setPurging(false)}
              className="text-[10px] font-mono uppercase tracking-widest text-cs-400 hover:text-black"
            >
              ✕
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
