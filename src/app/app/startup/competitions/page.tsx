import { createClient }        from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect }            from "next/navigation";
import { enterCompetition }    from "@/app/actions/competitions";

function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en", {
    month: "short", day: "numeric", year: "numeric",
  });
}

const STATUS_LABEL: Record<string, string> = {
  active:    "Open",
  scoring:   "Scoring in progress",
  closed:    "Closed",
  completed: "Completed",
};

const STATUS_COLOR: Record<string, string> = {
  active:    "text-green-600 bg-green-50",
  scoring:   "text-yellow-700 bg-yellow-50",
  closed:    "text-cs-400 bg-cs-100",
  completed: "text-cs-400 bg-cs-100",
};

export default async function StartupCompetitionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/en/login");

  const service = createServiceClient();

  const { data: userProfile } = await service
    .from("user_profiles")
    .select("entity_id")
    .eq("user_id", user.id)
    .single();

  if (!userProfile?.entity_id) redirect("/en/login");

  const startupId = userProfile.entity_id;

  const [
    { data: accredited },
    { data: competitions },
    { data: myEntries },
    { data: myScores },
  ] = await Promise.all([
    // Must have an accredited request to enter competitions
    service
      .from("accreditation_requests")
      .select("id")
      .eq("startup_id", startupId)
      .eq("status", "accredited")
      .maybeSingle(),

    // All visible competitions (not drafts)
    service
      .from("competitions")
      .select("id, name, description, industry, status, start_date, end_date")
      .in("status", ["active", "scoring", "closed", "completed"])
      .order("created_at", { ascending: false }),

    // Competitions this startup has entered
    service
      .from("competition_startups")
      .select("competition_id, entered_at")
      .eq("startup_id", startupId),

    // Scores received for this startup across all competitions
    service
      .from("competition_scores")
      .select("competition_id, score, notes, scored_at")
      .eq("startup_id", startupId),
  ]);

  const isAccredited = !!accredited;

  // Lookup maps keyed by competition_id
  const enteredSet  = new Set((myEntries  ?? []).map((e) => e.competition_id));
  const entryByComp = Object.fromEntries(
    (myEntries ?? []).map((e) => [e.competition_id, e])
  );
  const scoreByComp = Object.fromEntries(
    (myScores ?? []).map((s) => [s.competition_id, s])
  );

  const total = competitions?.length ?? 0;

  return (
    <div className="max-w-[860px] mx-auto px-7 py-8">

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-2 h-2 bg-sb-default" />
          <span className="text-[8px] font-mono text-cs-400 uppercase tracking-widest">
            Startup Portal
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Competitions</h1>
        <p className="text-[8px] font-mono text-cs-400 mt-1">
          {total} competition{total !== 1 ? "s" : ""} available
        </p>
      </div>

      {/* Accreditation gate notice */}
      {!isAccredited && (
        <div className="bg-[#1a1a1a] border border-[#333] px-5 py-3 mb-6 flex items-start gap-3">
          <div className="w-1 h-full bg-yellow-500 shrink-0 self-stretch" />
          <div>
            <div className="text-[7.5px] font-mono font-bold text-yellow-400 uppercase tracking-widest mb-1">
              Accreditation Required
            </div>
            <p className="text-[7.5px] font-mono text-cs-400">
              Only accredited startups can enter competitions.
              Complete your accreditation to unlock this feature.
            </p>
          </div>
        </div>
      )}

      {/* Competition list */}
      {total === 0 ? (
        <div className="bg-white border border-cs-200 px-5 py-12 text-center">
          <p className="text-[8px] font-mono text-cs-400">No competitions available right now.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {(competitions ?? []).map((comp) => {
            const entered   = enteredSet.has(comp.id);
            const entry     = entryByComp[comp.id];
            const scoreRow  = scoreByComp[comp.id];
            const canEnter  = isAccredited && comp.status === "active" && !entered;
            const statusLabel = STATUS_LABEL[comp.status] ?? comp.status;
            const statusColor = STATUS_COLOR[comp.status] ?? "text-cs-400 bg-cs-100";

            return (
              <div key={comp.id} className="bg-white border border-cs-200 px-5 py-4">
                <div className="flex items-start gap-4">

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-[9px] font-bold">{comp.name}</span>
                      <span className={`text-[6.5px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 ${statusColor}`}>
                        {statusLabel}
                      </span>
                      {entered && (
                        <span className="text-[6.5px] font-mono font-bold text-sb-default uppercase tracking-widest">
                          ✓ Entered
                        </span>
                      )}
                    </div>

                    {comp.description && (
                      <p className="text-[7.5px] font-mono text-cs-500 mb-2 leading-relaxed max-w-xl">
                        {comp.description}
                      </p>
                    )}

                    <div className="flex gap-5 text-[7px] font-mono text-cs-400">
                      {comp.industry && (
                        <span className="uppercase tracking-widest">{comp.industry}</span>
                      )}
                      {comp.start_date && <span>Opens: {fmt(comp.start_date)}</span>}
                      {comp.end_date   && <span>Closes: {fmt(comp.end_date)}</span>}
                      {entry?.entered_at && (
                        <span>Entered: {fmt(entry.entered_at)}</span>
                      )}
                    </div>

                    {/* Score display */}
                    {scoreRow && (
                      <div className="mt-3 flex items-center gap-5 bg-cs-50 border border-cs-200 px-3 py-2 w-fit">
                        <div>
                          <div className="text-[6.5px] font-mono text-cs-400 uppercase tracking-widest mb-0.5">
                            Score
                          </div>
                          <div className="text-[9px] font-bold text-sb-default">
                            {scoreRow.score}/100
                          </div>
                        </div>
                        {scoreRow.notes && (
                          <div>
                            <div className="text-[6.5px] font-mono text-cs-400 uppercase tracking-widest mb-0.5">
                              Evaluator notes
                            </div>
                            <div className="text-[7.5px] font-mono text-cs-500 max-w-[240px] truncate">
                              {scoreRow.notes}
                            </div>
                          </div>
                        )}
                        <div>
                          <div className="text-[6.5px] font-mono text-cs-400 uppercase tracking-widest mb-0.5">
                            Scored on
                          </div>
                          <div className="text-[7.5px] font-mono text-cs-500">
                            {fmt(scoreRow.scored_at)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action */}
                  <div className="shrink-0 self-start mt-1">
                    {canEnter ? (
                      <form action={enterCompetition}>
                        <input type="hidden" name="competition_id" value={comp.id} />
                        <button type="submit" className="btn-primary btn-sm">
                          Enter Competition
                        </button>
                      </form>
                    ) : entered && !scoreRow ? (
                      <span className="text-[7.5px] font-mono text-cs-400 border border-cs-200 bg-cs-50 px-3 py-1.5">
                        Pending scoring
                      </span>
                    ) : entered && scoreRow ? (
                      <span className="text-[7.5px] font-mono text-sb-default border border-sb-default px-3 py-1.5 font-bold">
                        Scored
                      </span>
                    ) : comp.status === "active" && !isAccredited ? (
                      <span className="text-[7.5px] font-mono text-cs-400 border border-cs-200 px-3 py-1.5 opacity-50">
                        Accreditation required
                      </span>
                    ) : (
                      <span className="text-[7.5px] font-mono text-cs-400">
                        {comp.status === "completed" || comp.status === "closed" ? "Closed" : "Not open"}
                      </span>
                    )}
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
