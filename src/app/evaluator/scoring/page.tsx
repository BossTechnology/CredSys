import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { scoreEntry } from "@/app/actions/competitions";
import { formatDate } from "@/lib/utils";

export default async function EvaluatorScoringPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createServiceClient();

  // Get all active competition entries (unscored or assigned to this evaluator)
  const { data: entries } = await admin
    .from("competition_entries")
    .select("id, competition_id, startup_id, score, rank, submitted_at, scored_at, evaluator_id")
    .order("submitted_at", { ascending: true });

  const entryIds = (entries ?? []).map((e) => e.id);
  const startupIds = [...new Set((entries ?? []).map((e) => e.startup_id))];
  const competitionIds = [...new Set((entries ?? []).map((e) => e.competition_id))];

  // Fetch startup names and competition titles
  const [{ data: profiles }, { data: competitions }] = await Promise.all([
    startupIds.length > 0
      ? admin.from("profiles").select("user_id, org_name").in("user_id", startupIds)
      : { data: [] },
    competitionIds.length > 0
      ? admin.from("competitions").select("id, title, status").in("id", competitionIds)
      : { data: [] },
  ]);

  const profileMap = Object.fromEntries(
    (profiles ?? []).map((p) => [p.user_id, p.org_name])
  );
  const compMap = Object.fromEntries(
    (competitions ?? []).map((c) => [c.id, { title: c.title, status: c.status }])
  );

  const pending = (entries ?? []).filter((e) => !e.scored_at);
  const scored = (entries ?? []).filter((e) => !!e.scored_at);

  return (
    <div className="max-w-[900px] mx-auto px-7 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Competition Scoring</h1>
        <p className="text-[8px] font-mono text-cs-400 uppercase tracking-widest mt-1">
          {pending.length} Pending · {scored.length} Scored
        </p>
      </div>

      <SectionDivider label="Pending Scoring" className="mb-3" />

      {pending.length === 0 ? (
        <div className="border border-cs-200 bg-white px-6 py-8 text-center mb-6">
          <p className="text-[9px] font-mono text-cs-400">All entries have been scored. ✓</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 mb-6">
          {pending.map((entry) => {
            const startupName = profileMap[entry.startup_id] ?? "Unknown Startup";
            const comp = compMap[entry.competition_id];
            return (
              <div
                key={entry.id}
                className="border border-cs-200 bg-white px-5 py-4"
              >
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1">
                    <div className="text-[9px] font-bold mb-0.5">{startupName}</div>
                    {comp && (
                      <div className="text-[7.5px] font-mono text-cs-500 mb-2">
                        Competition: <span className="text-black font-semibold">{comp.title}</span>
                      </div>
                    )}
                    <div className="text-[7px] font-mono text-cs-400">
                      Submitted: {entry.submitted_at ? formatDate(entry.submitted_at) : "—"}
                    </div>
                  </div>

                  <form action={scoreEntry} className="flex items-end gap-2 shrink-0">
                    <input type="hidden" name="entry_id" value={entry.id} />
                    <div>
                      <label className="text-[7px] font-mono text-cs-400 uppercase tracking-widest block mb-1">
                        Score (0–100)
                      </label>
                      <input
                        type="number"
                        name="score"
                        min={0}
                        max={100}
                        required
                        placeholder="85"
                        className="w-20 border border-cs-200 bg-cs-50 px-2 py-1.5 text-[8px] font-mono focus:outline-none focus:border-black"
                      />
                    </div>
                    <Button type="submit" size="sm" variant="accent">
                      Submit Score
                    </Button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {scored.length > 0 && (
        <>
          <SectionDivider label="Scored Entries" className="mb-3" />
          <div className="border border-cs-200 bg-white divide-y divide-cs-100">
            {scored.map((entry) => {
              const startupName = profileMap[entry.startup_id] ?? "Unknown";
              const comp = compMap[entry.competition_id];
              return (
                <div key={entry.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <div className="text-[8px] font-semibold">{startupName}</div>
                    {comp && (
                      <div className="text-[7px] font-mono text-cs-400">{comp.title}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-[7px] font-mono text-cs-400 uppercase tracking-widest">Score</div>
                      <div className="text-[9px] font-bold text-sb-text">{entry.score ?? "—"}/100</div>
                    </div>
                    {entry.rank && (
                      <div className="text-right">
                        <div className="text-[7px] font-mono text-cs-400 uppercase tracking-widest">Rank</div>
                        <div className="text-[9px] font-bold">#{entry.rank}</div>
                      </div>
                    )}
                    <div className="text-[7px] font-mono text-cs-400">
                      {entry.scored_at ? formatDate(entry.scored_at) : "—"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
