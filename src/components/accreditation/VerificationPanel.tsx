"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import { saveVerification } from "@/app/actions/verification";
import type {
  BLIPSData,
  ADDISData,
  VerificationCategory,
  VerificationItem,
} from "@/lib/supabase/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface VerificationPanelProps {
  requestId:     string;
  initialBLIPS?: BLIPSData | null;
  initialADDIS?: ADDISData | null;
  initialNotes?: string | null;
  readOnly?:     boolean;
}

type PanelView = "setup" | "manual" | "data";

// ─── Env / InEx Badges ────────────────────────────────────────────────────────

function EnvBadge({ env }: { env?: string }) {
  if (!env) return null;
  const ctrl = env.toLowerCase().startsWith("controlled") && !env.toLowerCase().startsWith("uncontrolled");
  return (
    <span className={`px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider leading-none ${
      ctrl ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
    }`}>
      {ctrl ? "Controlled" : "Uncontrolled"}
    </span>
  );
}

function InExBadge({ inEx }: { inEx?: string }) {
  if (!inEx) return null;
  const internal = inEx.toLowerCase() === "internal";
  return (
    <span className={`px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider leading-none ${
      internal ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
    }`}>
      {internal ? "Internal" : "External"}
    </span>
  );
}

// ─── Single Item Row ──────────────────────────────────────────────────────────

function ItemRow({
  item,
  onToggle,
  readOnly,
}: {
  item:      VerificationItem;
  onToggle?: (verified: boolean) => void;
  readOnly:  boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasDetail = !!(item.description || item.data || item.source);

  return (
    <div className={`border-b border-cs-100 last:border-0 transition-colors ${
      item.verified ? "bg-sb-light/10" : ""
    }`}>
      <div className="flex items-start gap-2 px-4 py-2.5">
        {/* Checkbox / status icon */}
        {!readOnly ? (
          <input
            type="checkbox"
            checked={item.verified}
            onChange={(e) => onToggle?.(e.target.checked)}
            className="accent-black w-3.5 h-3.5 shrink-0 mt-0.5 cursor-pointer"
          />
        ) : (
          <span className={`w-3.5 h-3.5 shrink-0 mt-0.5 text-[12px] flex items-center justify-center ${
            item.verified ? "text-green-600" : "text-cs-300"
          }`}>
            {item.verified ? "✓" : "○"}
          </span>
        )}

        {/* Item details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[12px] font-mono ${
              item.verified ? "font-semibold text-black" : "text-cs-700"
            }`}>
              {item.item}
            </span>
            {item.type && (
              <span className="px-1.5 py-0.5 bg-cs-100 text-cs-500 text-[9px] font-mono uppercase tracking-wider leading-none">
                {item.type}
              </span>
            )}
            <EnvBadge env={item.env} />
            <InExBadge inEx={item.inEx} />
          </div>
        </div>

        {/* Expand toggle */}
        {hasDetail && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-[10px] font-mono text-cs-400 hover:text-black transition-colors shrink-0 mt-0.5"
            title={expanded ? "Collapse" : "Expand details"}
          >
            {expanded ? "▲" : "▼"}
          </button>
        )}

        {/* Verified label (read-only) */}
        {readOnly && item.verified && (
          <span className="text-[10px] font-mono text-sb-text uppercase tracking-widest shrink-0 mt-0.5">
            ✓ Verified
          </span>
        )}
      </div>

      {/* Expanded detail */}
      {expanded && hasDetail && (
        <div className="px-4 pb-3 pl-9 space-y-1">
          {item.data && (
            <p className="text-[11px] font-mono text-cs-500">
              <span className="text-cs-400">Data: </span>{item.data}
            </p>
          )}
          {item.source && (
            <p className="text-[11px] font-mono text-cs-500">
              <span className="text-cs-400">Source: </span>{item.source}
            </p>
          )}
          {item.description && (
            <p className="text-[11px] text-cs-600 leading-relaxed">{item.description}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Data Section (BLIPS or ADDIS) ───────────────────────────────────────────

function DataSection({
  label,
  data,
  onItemToggle,
  readOnly,
}: {
  label:         string;
  data:          VerificationCategory[];
  onItemToggle?: (catIdx: number, itemIdx: number, verified: boolean) => void;
  readOnly:      boolean;
}) {
  const totalItems    = data.reduce((s, c) => s + c.items.length, 0);
  const verifiedItems = data.reduce((s, c) => s + c.items.filter((i) => i.verified).length, 0);
  const allDone       = totalItems > 0 && verifiedItems === totalItems;

  return (
    <div className="border border-cs-200 bg-white flex flex-col">
      {/* Section header */}
      <div className="px-4 py-2.5 bg-cs-50 border-b border-cs-200 flex items-center justify-between shrink-0">
        <span className="text-[12px] font-mono font-bold uppercase tracking-widest">{label}</span>
        <span className={`text-[13px] font-mono ${allDone ? "text-green-600 font-bold" : "text-cs-400"}`}>
          {verifiedItems}/{totalItems}
        </span>
      </div>

      {/* Categories */}
      <div className="flex-1 overflow-auto">
        {data.map((cat, catIdx) => {
          const catVerified = cat.items.filter((i) => i.verified).length;
          return (
            <div key={`${cat.name}-${catIdx}`}>
              {/* Category header */}
              <div className="px-4 py-1.5 bg-black flex items-center justify-between">
                <span className="text-[10px] font-mono text-white uppercase tracking-widest">
                  {cat.name}
                </span>
                <span className={`text-[10px] font-mono ${
                  catVerified === cat.items.length ? "text-green-400" : "text-cs-500"
                }`}>
                  {catVerified}/{cat.items.length}
                </span>
              </div>

              {/* Items */}
              {cat.items.map((item, itemIdx) => (
                <ItemRow
                  key={itemIdx}
                  item={item}
                  onToggle={
                    onItemToggle
                      ? (v) => onItemToggle(catIdx, itemIdx, v)
                      : undefined
                  }
                  readOnly={readOnly}
                />
              ))}

              {cat.items.length === 0 && (
                <div className="px-4 py-3 text-[11px] font-mono text-cs-400 italic">
                  No items in this category
                </div>
              )}
            </div>
          );
        })}

        {data.length === 0 && (
          <div className="px-4 py-8 text-center text-[12px] font-mono text-cs-400">
            No categories
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Manual Builder Section ───────────────────────────────────────────────────

function ManualSection({
  label,
  data,
  onChange,
}: {
  label:    string;
  data:     VerificationCategory[];
  onChange: (d: VerificationCategory[]) => void;
}) {
  const [newCatName,    setNewCatName]    = useState("");
  const [newItemInputs, setNewItemInputs] = useState<Record<string, string>>({});

  function addCategory() {
    const name = newCatName.trim();
    if (!name) return;
    if (data.some((c) => c.name === name)) return; // no duplicates
    onChange([...data, { name, items: [] }]);
    setNewCatName("");
  }

  function removeCategory(catName: string) {
    onChange(data.filter((c) => c.name !== catName));
  }

  function addItem(catName: string) {
    const itemName = (newItemInputs[catName] ?? "").trim();
    if (!itemName) return;
    onChange(
      data.map((cat) =>
        cat.name === catName
          ? { ...cat, items: [...cat.items, { item: itemName, verified: false }] }
          : cat,
      ),
    );
    setNewItemInputs((prev) => ({ ...prev, [catName]: "" }));
  }

  function removeItem(catName: string, idx: number) {
    onChange(
      data.map((cat) =>
        cat.name === catName
          ? { ...cat, items: cat.items.filter((_, i) => i !== idx) }
          : cat,
      ),
    );
  }

  return (
    <div>
      <div className="text-[11px] font-mono text-cs-400 uppercase tracking-widest mb-2">{label}</div>
      <div className="border border-cs-200 bg-white">
        {data.map((cat) => (
          <div key={cat.name} className="border-b border-cs-200 last:border-0">
            {/* Category header */}
            <div className="flex items-center gap-2 px-3 py-2 bg-cs-50">
              <span className="text-[12px] font-mono font-semibold flex-1 truncate">{cat.name}</span>
              <button
                type="button"
                onClick={() => removeCategory(cat.name)}
                className="text-cs-400 hover:text-red-500 text-[14px] leading-none shrink-0"
                title="Remove category"
              >
                ×
              </button>
            </div>

            {/* Items */}
            <div className="px-3 py-2 space-y-1.5">
              {cat.items.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[12px] font-mono text-cs-700 flex-1 truncate">
                    · {item.item}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeItem(cat.name, i)}
                    className="text-cs-300 hover:text-red-500 text-[13px] leading-none shrink-0"
                    title="Remove item"
                  >
                    ×
                  </button>
                </div>
              ))}

              {/* Add item row */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Item name…"
                  value={newItemInputs[cat.name] ?? ""}
                  onChange={(e) =>
                    setNewItemInputs((prev) => ({ ...prev, [cat.name]: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); addItem(cat.name); }
                  }}
                  className="cs-input text-[12px] flex-1 py-1"
                />
                <button
                  type="button"
                  onClick={() => addItem(cat.name)}
                  className="btn-outline btn-sm text-[11px] px-2 shrink-0"
                >
                  + Add
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Add category row */}
        <div className="flex items-center gap-2 p-3 border-t border-dashed border-cs-200">
          <input
            type="text"
            placeholder="New category name…"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); addCategory(); }
            }}
            className="cs-input text-[12px] flex-1 py-1"
          />
          <button
            type="button"
            onClick={addCategory}
            className="btn-outline btn-sm text-[11px] px-2 shrink-0 whitespace-nowrap"
          >
            + Category
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function VerificationPanel({
  requestId,
  initialBLIPS,
  initialADDIS,
  initialNotes,
  readOnly = false,
}: VerificationPanelProps) {
  const hasInitialData = Array.isArray(initialBLIPS) || Array.isArray(initialADDIS);

  // ── State ──────────────────────────────────────────────────────────────────
  const [view,     setView    ] = useState<PanelView>(hasInitialData ? "data" : "setup");
  const [blipsData, setBlipsData] = useState<BLIPSData | null>(
    Array.isArray(initialBLIPS) ? initialBLIPS : null,
  );
  const [addisData, setAddisData] = useState<ADDISData | null>(
    Array.isArray(initialADDIS) ? initialADDIS : null,
  );

  // Import state
  const [importUrl,  setImportUrl ] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Manual-entry state
  const [manualBlips, setManualBlips] = useState<BLIPSData>([]);
  const [manualAddis, setManualAddis] = useState<ADDISData>([]);

  // Save state
  const [notes,     setNotes    ] = useState(initialNotes ?? "");
  const [saved,     setSaved    ] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Latest refs (avoid stale closure in auto-save)
  const latestBlips = useRef(blipsData);
  const latestAddis = useRef(addisData);
  const latestNotes = useRef(notes);
  latestBlips.current = blipsData;
  latestAddis.current = addisData;
  latestNotes.current = notes;

  // ── Totals ─────────────────────────────────────────────────────────────────
  const blipsTotal    = blipsData?.reduce((s, c) => s + c.items.length, 0) ?? 0;
  const blipsVerified = blipsData?.reduce((s, c) => s + c.items.filter((i) => i.verified).length, 0) ?? 0;
  const addisTotal    = addisData?.reduce((s, c) => s + c.items.length, 0) ?? 0;
  const addisVerified = addisData?.reduce((s, c) => s + c.items.filter((i) => i.verified).length, 0) ?? 0;
  const totalItems    = blipsTotal + addisTotal;
  const totalVerified = blipsVerified + addisVerified;
  const allVerified   =
    totalItems > 0 && totalVerified === totalItems;

  // ── Save ───────────────────────────────────────────────────────────────────
  const triggerSave = useCallback(
    (nextBlips: BLIPSData | null, nextAddis: ADDISData | null, nextNotes?: string) => {
      setSaved(false);
      setSaveError(null);

      const fd = new FormData();
      fd.set("request_id",      requestId);
      fd.set("evaluator_notes", nextNotes ?? latestNotes.current);
      if (nextBlips) fd.set("blips_data", JSON.stringify(nextBlips));
      if (nextAddis) fd.set("addis_data", JSON.stringify(nextAddis));

      startTransition(async () => {
        const result = await saveVerification(fd);
        if (result.error) {
          setSaveError(result.error);
        } else {
          setSaved(true);
          setTimeout(() => setSaved(false), 2500);
        }
      });
    },
    [requestId],
  );

  // ── Chassis import ─────────────────────────────────────────────────────────
  async function handleFetch() {
    const url = importUrl.trim();
    if (!url) return;
    setIsFetching(true);
    setFetchError(null);

    try {
      const res  = await fetch("/api/chassis/fetch", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ url }),
      });
      const json = await res.json();

      if (!res.ok || json.error) {
        setFetchError(json.error ?? "Failed to import chassis data");
        return;
      }

      const b: BLIPSData = json.blips ?? [];
      const a: ADDISData = json.addis ?? [];
      setBlipsData(b);
      setAddisData(a);
      setView("data");
      triggerSave(b, a); // persist immediately
    } catch {
      setFetchError("Network error — could not reach chassis");
    } finally {
      setIsFetching(false);
    }
  }

  // ── Manual confirm ─────────────────────────────────────────────────────────
  function confirmManual() {
    setBlipsData(manualBlips);
    setAddisData(manualAddis);
    setView("data");
    triggerSave(manualBlips, manualAddis);
  }

  // ── Item toggle handlers ───────────────────────────────────────────────────
  function handleBlipsToggle(catIdx: number, itemIdx: number, verified: boolean) {
    const next = blipsData!.map((cat, ci) =>
      ci === catIdx
        ? {
            ...cat,
            items: cat.items.map((item, ii) =>
              ii === itemIdx ? { ...item, verified } : item,
            ),
          }
        : cat,
    );
    setBlipsData(next);
    triggerSave(next, latestAddis.current);
  }

  function handleAddisToggle(catIdx: number, itemIdx: number, verified: boolean) {
    const next = addisData!.map((cat, ci) =>
      ci === catIdx
        ? {
            ...cat,
            items: cat.items.map((item, ii) =>
              ii === itemIdx ? { ...item, verified } : item,
            ),
          }
        : cat,
    );
    setAddisData(next);
    triggerSave(latestBlips.current, next);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* ── SETUP: no data yet ──────────────────────────────────────────────── */}
      {view === "setup" && !readOnly && (
        <div className="border border-cs-200 bg-white">
          <div className="px-4 py-2.5 border-b border-cs-200 bg-cs-50">
            <span className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
              Load Verification Data
            </span>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Import from CHASS1S URL */}
            <div className="border border-cs-200 p-4 flex flex-col gap-3">
              <div>
                <div className="text-[13px] font-mono font-bold mb-1">
                  Import from CHASS1S
                </div>
                <p className="text-[11px] text-cs-400 leading-relaxed">
                  Paste the startup&apos;s CHASS1S share URL to auto-load their BLIPS and
                  ADDIS data with full component details.
                </p>
              </div>
              <input
                type="text"
                placeholder="www.chass1s.com/api/share/..."
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleFetch()}
                className="cs-input text-[12px]"
              />
              {fetchError && (
                <p className="text-[11px] text-red-600 font-mono">{fetchError}</p>
              )}
              <button
                type="button"
                onClick={handleFetch}
                disabled={isFetching || !importUrl.trim()}
                className="btn-primary btn-sm self-start"
              >
                {isFetching ? "Importing…" : "Fetch & Import"}
              </button>
            </div>

            {/* Manual entry */}
            <div className="border border-cs-200 p-4 flex flex-col gap-3">
              <div>
                <div className="text-[13px] font-mono font-bold mb-1">
                  Enter Manually
                </div>
                <p className="text-[11px] text-cs-400 leading-relaxed">
                  Build BLIPS and ADDIS categories and components manually, without a
                  CHASS1S URL.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setView("manual")}
                className="btn-outline btn-sm self-start"
              >
                Enter Manually →
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── SETUP: read-only, no data ────────────────────────────────────────── */}
      {view === "setup" && readOnly && (
        <div className="border border-cs-200 bg-cs-50 px-4 py-8 text-center">
          <p className="text-[12px] font-mono text-cs-400">
            Verification data not yet loaded
          </p>
        </div>
      )}

      {/* ── MANUAL ENTRY ─────────────────────────────────────────────────────── */}
      {view === "manual" && !readOnly && (
        <div className="space-y-5">
          {/* Back nav */}
          <button
            type="button"
            onClick={() => setView("setup")}
            className="text-[11px] font-mono text-cs-400 uppercase tracking-widest hover:text-black transition-colors"
          >
            ← Back
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ManualSection
              label="BLIPS — Business Performance"
              data={manualBlips}
              onChange={setManualBlips}
            />
            <ManualSection
              label="ADDIS — Digital Stack"
              data={manualAddis}
              onChange={setManualAddis}
            />
          </div>

          <button
            type="button"
            onClick={confirmManual}
            disabled={manualBlips.length === 0 && manualAddis.length === 0}
            className="btn-primary btn-lg"
          >
            Confirm &amp; Start Verifying
          </button>
        </div>
      )}

      {/* ── DATA VIEW ────────────────────────────────────────────────────────── */}
      {view === "data" && (
        <div className="space-y-4">

          {/* Reset link */}
          {!readOnly && (
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => {
                  setView("setup");
                  setBlipsData(null);
                  setAddisData(null);
                  setImportUrl("");
                  setFetchError(null);
                }}
                className="text-[11px] font-mono text-cs-400 hover:text-red-500 underline transition-colors"
              >
                Reset verification data
              </button>
            </div>
          )}

          {/* BLIPS + ADDIS side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {blipsData && blipsData.length > 0 && (
              <DataSection
                label="BLIPS"
                data={blipsData}
                onItemToggle={!readOnly ? handleBlipsToggle : undefined}
                readOnly={readOnly}
              />
            )}
            {addisData && addisData.length > 0 && (
              <DataSection
                label="ADDIS"
                data={addisData}
                onItemToggle={!readOnly ? handleAddisToggle : undefined}
                readOnly={readOnly}
              />
            )}
          </div>

          {/* All verified banner */}
          {allVerified && (
            <div className="bg-sb-light border border-sb-default px-4 py-2.5 text-[12px] font-mono text-sb-text font-semibold">
              ✓ All {totalItems} items verified — ready to accredit
            </div>
          )}

          {/* Progress summary (non-zero, not all done) */}
          {!allVerified && totalItems > 0 && (
            <div className="text-[11px] font-mono text-cs-400">
              {totalVerified} of {totalItems} items verified
              {!readOnly && " — check items above to mark them as verified"}
            </div>
          )}

          {/* Evaluator notes */}
          {!readOnly && (
            <div>
              <label className="cs-label">Evaluator Notes (shared with startup)</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  latestNotes.current = e.target.value;
                }}
                placeholder="Optional notes visible to the startup…"
                className="cs-input resize-none"
              />
            </div>
          )}

          {readOnly && notes && (
            <div className="border border-cs-200 bg-cs-50 px-4 py-3">
              <div className="text-[12px] font-mono text-cs-400 uppercase tracking-widest mb-1">
                Evaluator Notes
              </div>
              <p className="text-[13px] text-cs-700 leading-relaxed">{notes}</p>
            </div>
          )}

          {/* Save controls */}
          {!readOnly && (
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => triggerSave(blipsData, addisData)}
                disabled={isPending}
                className="btn-primary btn-sm"
              >
                {isPending ? "Saving…" : "Save Progress"}
              </button>
              {isPending && (
                <span className="text-[12px] font-mono text-cs-400 animate-pulse">
                  Saving…
                </span>
              )}
              {!isPending && saved && (
                <span className="text-[12px] font-mono text-sb-text">
                  ✓ Auto-saved
                </span>
              )}
              {saveError && (
                <span className="text-[12px] font-mono text-red-600">{saveError}</span>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
