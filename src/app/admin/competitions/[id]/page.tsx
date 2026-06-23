import { createServiceClient }         from "@/lib/supabase/service";
import { notFound }                     from "next/navigation";
import { getAppDictionary }             from "@/lib/i18n/loader";
import {
  assignEvaluatorToCompetition,
  updateCompetitionStatus,
  publishResults,
} from "@/app/actions/competitions";

function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en", {
    month: "short", day: "numeric", year: "numeric",
  });
}

const STATUS_COLOR: Record<string, string> = {
  draft:     "text-cs-400 bg-cs-100",
  active:    "text-green-700 bg-green-50",
  scoring:   "text-yellow-700 bg-yellow-50",
  closed:    "text-cs-400 bg-cs-100",
  completed: "text-sb-default bg-[#1a1030]",
};

// Next valid transitions per status
const NEXT_STATUS: Record<string, { label: string; value: string; danger?: boolean }[]> = {
  draft:     [{ label: "Open for Entries",  value: "active"    }],
  active:    [{ label: "Move to Scoring",   value: "scoring"   }, { label: "Close",  value: "closed", danger: true }],
  scoring:   [{ label: "Close Scoring",     value: "closed"    }],
  closed:    [],
  completed: [],
};

export default async function AdminCompetitionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { dict } = await getAppDictionary();
  const t = dict.admin;
  const service = createServiceClient();

  const [
    { data: comp },
    { data: entries },
    { data: scores },
    { data: compEvaluators },
    { data: allEvaluators },
  ] = await Promise.all([
    service
      .from("competitions")
      .select("id, name, description, industry, status, start_date, end_date, accelerator_id")
      .eq("id", id)
      .single(),

    // Startups that entered
    service
      .from("competition_startups")
      .select("startup_id, entered_at, startups(org_name, email)")
      .eq("competition_id", id)
      .order("entered_at", { ascending: true }),

    // All scores for this competition
    service
      .from("competition_scores")
      .select("startup_id, evaluator_id, score, notes, scored_at")
      .eq("competition_id", id),

    // Evaluators assigned to this competition
    service
      .from("competition_evaluators")
      .select("evaluator_id, assigned_at, evaluators(org_name)")
      .eq("competition_id", id),

    // All active evaluators (for assignment dropdown)
    service
      .from("evaluators")
      .select("id, org_name")
      .eq("is_active", true)
      .order("org_name"),
  ]);

  if (!comp) notFound();

  // Build per-startup score summary (average across evaluators)
  const scoreMap = new Map<string, number[]>();
  for (const s of scores ?? []) {
    const arr = scoreMap.get(s.startup_id) ?? [];
    arr.push(Number(s.score));
    scoreMap.set(s.startup_id, arr);
  }
  const avgScore = (startupId: string) => {
    const arr = scoreMap.get(startupId);
    if (!arr || arr.length === 0) return null;
    return (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1);
  };

  // Ranked entries (by average score, descending)
  const rankedEntries = [...(entries ?? [])].sort((a, b) => {
    const sa = avgScore(a.startup_id);
    const sb = avgScore(b.startup_id);
    if (sa == null && sb == null) return 0;
    if (sa == null) return 1;
    if (sb == null) return -1;
    return Number(sb) - Number(sa);
  });

  const assignedEvalIds = new Set((compEvaluators ?? []).map((e) => e.evaluator_id));
  const unassignedEvals = (allEvaluators ?? []).filter((e) => !assignedEvalIds.has(e.id));

  const nextStatuses = NEXT_STATUS[comp.status] ?? [];
  const canPublish   = comp.status === "scoring" || comp.status === "closed";

  return (
    <div className="max-w-[960px] mx-auto px-4 sm:px-7 py-8">

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <a href="/admin/competitions" className="text-[12px] font-mono text-cs-400 uppercase tracking-widest hover:text-black">
            ← {t.competitions}
          </a>
        </div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold tracking-tight">{comp.name}</h1>
          <span className={`text-[11px] font-mono font-bold uppercase tracking-widest px-2 py-1 ${STATUS_COLOR[comp.status] ?? "text-cs-400 bg-cs-100"}`}>
            {comp.status === "active" ? t.active : comp.status}
          </span>
        </div>
        <div className="flex flex-wrap gap-3 sm:gap-5 text-[12px] font-mono text-cs-400">
          {comp.industry && <span className="uppercase">{comp.industry}</span>}
          {comp.start_date && <span>Opens: {fmt(comp.start_date)}</span>}
          {comp.end_date   && <span>Closes: {fmt(comp.end_date)}</span>}
        </div>
        {comp.description && (
          <p className="text-[12px] font-mono text-cs-500 mt-2 max-w-xl leading-relaxed">
            {comp.description}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">

        {/* ── Left column: roster + scores ── */}
        <div className="flex flex-col gap-6">

          {/* Roster */}
          <div className="bg-white border border-cs-200 overflow-x-auto">
            <div className="px-5 py-2 border-b border-cs-200 bg-cs-50">
              <span className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
                {t.entries} · {entries?.length ?? 0}
              </span>
            </div>
            {(entries ?? []).length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-[13px] font-mono text-cs-400">{t.noEntries}</p>
              </div>
            ) : (
              <>
                {/* Column headers */}
                <div className="grid min-w-[480px] grid-cols-[1fr_80px_80px_100px] gap-3 px-5 py-2 border-b border-cs-100 bg-cs-50">
                  {[t.startup, t.scores, t.avgScore, t.submitted].map((h) => (
                    <div key={h} className="text-[11px] font-mono text-cs-400 uppercase tracking-widest">{h}</div>
                  ))}
                </div>
                <div className="divide-y divide-cs-100">
                  {rankedEntries.map((entry, idx) => {
                    const startup = entry.startups as unknown as { org_name: string; email: string } | null;
                    const avg     = avgScore(entry.startup_id);
                    const count   = (scoreMap.get(entry.startup_id) ?? []).length;
                    return (
                      <div key={entry.startup_id} className="grid min-w-[480px] grid-cols-[1fr_80px_80px_100px] gap-3 px-5 py-3 items-center">
                        <div>
                          <div className="flex items-center gap-2">
                            {avg != null && (
                              <span className="text-[12px] font-mono text-cs-400 w-4">#{idx + 1}</span>
                            )}
                            <span className="text-[13px] font-semibold">{startup?.org_name ?? "—"}</span>
                          </div>
                          <div className="text-[12px] font-mono text-cs-400">{startup?.email ?? ""}</div>
                        </div>
                        <div className="text-[12px] font-mono text-cs-400">
                          {count > 0 ? `${count} score${count !== 1 ? "s" : ""}` : "—"}
                        </div>
                        <div className={`text-[13px] font-bold font-mono ${avg != null ? "text-sb-default" : "text-cs-300"}`}>
                          {avg != null ? `${avg}/100` : "—"}
                        </div>
                        <div className="text-[12px] font-mono text-cs-400">
                          {fmt(entry.entered_at)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Score detail (per evaluator) */}
          {(scores ?? []).length > 0 && (
            <div className="bg-white border border-cs-200 overflow-x-auto">
              <div className="px-5 py-2 border-b border-cs-200 bg-cs-50">
                <span className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
                  {t.scores} · {scores?.length}
                </span>
              </div>
              <div className="divide-y divide-cs-100">
                {(scores ?? []).map((s, i) => {
                  const startup   = (entries ?? []).find((e) => e.startup_id === s.startup_id);
                  const evaluator = (compEvaluators ?? []).find((e) => e.evaluator_id === s.evaluator_id);
                  const sInfo     = startup?.startups  as unknown as { org_name: string } | null;
                  const eInfo     = evaluator?.evaluators as unknown as { org_name: string } | null;
                  return (
                    <div key={i} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold truncate">{sInfo?.org_name ?? s.startup_id.slice(0,8)}</div>
                        <div className="text-[12px] font-mono text-cs-400">
                          by {eInfo?.org_name ?? "—"} · {fmt(s.scored_at)}
                        </div>
                        {s.notes && (
                          <div className="text-[12px] font-mono text-cs-500 mt-0.5 italic">{s.notes}</div>
                        )}
                      </div>
                      <div className="text-[13px] font-bold font-mono text-sb-default shrink-0">
                        {s.score}/100
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Right column: management ── */}
        <div className="flex flex-col gap-4">

          {/* Status controls */}
          {nextStatuses.length > 0 && (
            <div className="bg-white border border-cs-200 overflow-x-auto">
              <div className="px-5 py-2 border-b border-cs-200 bg-cs-50">
                <span className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
                  {t.updateStatus}
                </span>
              </div>
              <div className="p-4 flex flex-col gap-2">
                {nextStatuses.map((ns) => (
                  <form key={ns.value} action={updateCompetitionStatus}>
                    <input type="hidden" name="competition_id" value={comp.id} />
                    <input type="hidden" name="status"         value={ns.value} />
                    <button
                      type="submit"
                      className={`w-full btn-sm font-mono text-[12px] uppercase tracking-widest ${
                        ns.danger ? "btn-danger" : "btn-primary"
                      }`}
                    >
                      {ns.label}
                    </button>
                  </form>
                ))}
              </div>
            </div>
          )}

          {/* Publish results */}
          {canPublish && (
            <div className="bg-white border border-cs-200 overflow-x-auto">
              <div className="px-5 py-2 border-b border-cs-200 bg-cs-50">
                <span className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
                  {t.publishResults}
                </span>
              </div>
              <div className="p-4">
                <p className="text-[12px] font-mono text-cs-400 mb-3 leading-relaxed">
                  Computes final rankings from all scores and sends E9 result emails to every participant.
                </p>
                <form action={publishResults}>
                  <input type="hidden" name="competition_id" value={comp.id} />
                  <button type="submit" className="w-full btn-accent btn-sm">
                    {t.publishResults}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Evaluators */}
          <div className="bg-white border border-cs-200 overflow-x-auto">
            <div className="px-5 py-2 border-b border-cs-200 bg-cs-50">
              <span className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
                {t.evaluators} · {compEvaluators?.length ?? 0}
              </span>
            </div>
            {(compEvaluators ?? []).length > 0 && (
              <div className="divide-y divide-cs-100">
                {(compEvaluators ?? []).map((ce) => {
                  const eInfo = ce.evaluators as unknown as { org_name: string } | null;
                  return (
                    <div key={ce.evaluator_id} className="px-4 py-2.5 flex items-center justify-between">
                      <span className="text-[12px] font-mono">{eInfo?.org_name ?? ce.evaluator_id.slice(0,8)}</span>
                      <span className="text-[12px] font-mono text-cs-400">{fmt(ce.assigned_at)}</span>
                    </div>
                  );
                })}
              </div>
            )}
            {unassignedEvals.length > 0 && (
              <div className="p-4 border-t border-cs-100">
                <form action={assignEvaluatorToCompetition} className="flex gap-2">
                  <input type="hidden" name="competition_id" value={comp.id} />
                  <select name="evaluator_id" required className="cs-input flex-1 text-[12px]">
                    <option value="">{t.select}</option>
                    {unassignedEvals.map((e) => (
                      <option key={e.id} value={e.id}>{e.org_name}</option>
                    ))}
                  </select>
                  <button type="submit" className="btn-primary btn-sm shrink-0">
                    {t.assignEvaluatorComp}
                  </button>
                </form>
              </div>
            )}
          </div>

        </div>
      </div>

    </div>
  );
}
