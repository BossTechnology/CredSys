"use client";

import { useState, useTransition } from "react";
import { saveVerification }        from "@/app/actions/verification";
import type { BLIPSVerification, ADDISVerification } from "@/lib/supabase/types";

// ─── Criteria definitions ─────────────────────────────────────────────────────

const BLIPS_CRITERIA: { key: keyof BLIPSVerification; letter: string; label: string }[] = [
  { key: "b", letter: "B", label: "Business model validated"    },
  { key: "l", letter: "L", label: "Legal compliance confirmed"  },
  { key: "i", letter: "I", label: "Impact measurable"           },
  { key: "p", letter: "P", label: "Product demonstrated"        },
  { key: "s", letter: "S", label: "Scalability assessed"        },
];

const ADDIS_CRITERIA: { key: keyof ADDISVerification; letter: string; label: string }[] = [
  { key: "a",  letter: "A",  label: "Addressable market validated" },
  { key: "d",  letter: "D",  label: "Data / metrics reviewed"      },
  { key: "d2", letter: "D₂", label: "Differentiation confirmed"    },
  { key: "i",  letter: "I",  label: "Investment readiness"         },
  { key: "s",  letter: "S",  label: "Stage-appropriate"            },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface VerificationPanelProps {
  requestId:      string;
  initialBLIPS:   BLIPSVerification;
  initialADDIS:   ADDISVerification;
  initialNotes?:  string | null;
  readOnly?:      boolean;
}

// ─── Checkbox row ─────────────────────────────────────────────────────────────

function CriterionRow({
  name, letter, label, checked, onChange, readOnly,
}: {
  name:     string;
  letter:   string;
  label:    string;
  checked:  boolean;
  onChange: (v: boolean) => void;
  readOnly: boolean;
}) {
  return (
    <label
      className={`flex items-center gap-3 px-4 py-3 border-b border-cs-100 last:border-0 transition-colors ${
        readOnly ? "cursor-default" : "cursor-pointer hover:bg-cs-50"
      } ${checked ? "bg-sb-light/20" : ""}`}
    >
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(e) => !readOnly && onChange(e.target.checked)}
        disabled={readOnly}
        className="accent-black w-3.5 h-3.5 shrink-0"
      />
      <div
        className={`w-6 h-6 flex items-center justify-center shrink-0 text-[9px] font-bold font-mono ${
          checked ? "bg-sb-default text-sb-text" : "bg-cs-100 text-cs-400"
        }`}
      >
        {letter}
      </div>
      <span className={`text-[8px] font-mono ${checked ? "text-black font-semibold" : "text-cs-500"}`}>
        {label}
      </span>
      {checked && (
        <span className="ml-auto text-[6.5px] font-mono text-sb-text uppercase tracking-widest">
          ✓ Verified
        </span>
      )}
    </label>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function VerificationPanel({
  requestId,
  initialBLIPS,
  initialADDIS,
  initialNotes,
  readOnly = false,
}: VerificationPanelProps) {
  const [blips, setBlips] = useState<BLIPSVerification>(initialBLIPS);
  const [addis, setAddis] = useState<ADDISVerification>(initialADDIS);
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const blipsCount = BLIPS_CRITERIA.filter((c) => blips[c.key]).length;
  const addisCount = ADDIS_CRITERIA.filter((c) => addis[c.key]).length;
  const allVerified = blipsCount === 5 && addisCount === 5;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaved(false);
    setError(null);

    const fd = new FormData(e.currentTarget);
    fd.set("request_id", requestId);

    startTransition(async () => {
      const result = await saveVerification(fd);
      if (result.error) {
        setError(result.error);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="hidden" name="request_id" value={requestId} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-cs-200">

        {/* BLIPS */}
        <div className="border-r border-cs-200">
          <div className="px-4 py-2 bg-cs-50 border-b border-cs-200 flex items-center justify-between">
            <span className="text-[7.5px] font-mono font-bold uppercase tracking-widest">
              BLIPS
            </span>
            <span className={`text-[7px] font-mono ${blipsCount === 5 ? "text-sb-text font-bold" : "text-cs-400"}`}>
              {blipsCount}/5
            </span>
          </div>
          {BLIPS_CRITERIA.map((c) => (
            <CriterionRow
              key={c.key}
              name={`blips_${c.key}`}
              letter={c.letter}
              label={c.label}
              checked={!!blips[c.key]}
              onChange={(v) => setBlips((prev) => ({ ...prev, [c.key]: v }))}
              readOnly={readOnly}
            />
          ))}
        </div>

        {/* ADDIS */}
        <div>
          <div className="px-4 py-2 bg-cs-50 border-b border-cs-200 flex items-center justify-between">
            <span className="text-[7.5px] font-mono font-bold uppercase tracking-widest">
              ADDIS
            </span>
            <span className={`text-[7px] font-mono ${addisCount === 5 ? "text-sb-text font-bold" : "text-cs-400"}`}>
              {addisCount}/5
            </span>
          </div>
          {ADDIS_CRITERIA.map((c) => (
            <CriterionRow
              key={c.key}
              name={`addis_${c.key}`}
              letter={c.letter}
              label={c.label}
              checked={!!addis[c.key]}
              onChange={(v) => setAddis((prev) => ({ ...prev, [c.key]: v }))}
              readOnly={readOnly}
            />
          ))}
        </div>
      </div>

      {/* All verified banner */}
      {allVerified && (
        <div className="mt-3 bg-sb-light border border-sb-default px-4 py-2 text-[7.5px] font-mono text-sb-text font-semibold">
          ✓ All 10 criteria verified — ready to accredit
        </div>
      )}

      {/* Evaluator notes */}
      {!readOnly && (
        <div className="mt-4">
          <label className="cs-label">Evaluator Notes (shared with startup)</label>
          <textarea
            name="evaluator_notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes visible to the startup…"
            className="cs-input resize-none"
          />
        </div>
      )}

      {readOnly && notes && (
        <div className="mt-4 border border-cs-200 bg-cs-50 px-4 py-3">
          <div className="text-[6.5px] font-mono text-cs-400 uppercase tracking-widest mb-1">
            Evaluator Notes
          </div>
          <p className="text-[8px] text-cs-700 leading-relaxed">{notes}</p>
        </div>
      )}

      {/* Save */}
      {!readOnly && (
        <div className="mt-4 flex items-center gap-4">
          <button
            type="submit"
            disabled={isPending}
            className="btn-primary btn-sm"
          >
            {isPending ? "Saving…" : "Save Progress"}
          </button>
          {saved && (
            <span className="text-[7.5px] font-mono text-sb-text">
              ✓ Saved
            </span>
          )}
          {error && (
            <span className="text-[7.5px] font-mono text-red-600">{error}</span>
          )}
        </div>
      )}
    </form>
  );
}
