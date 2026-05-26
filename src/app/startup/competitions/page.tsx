import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { Button } from "@/components/ui/Button";
import { AlertBox } from "@/components/ui/AlertBox";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import { enterCompetition } from "@/app/actions/competitions";
import type { CompetitionStatus, AccreditationStatus } from "@/lib/supabase/types";

const STATUS_LABEL: Record<CompetitionStatus, string> = {
  draft: "Draft",
  active: "Open",
  scoring: "Scoring",
  completed: "Completed",
};

export default async function StartupCompetitionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  const [{ data: accredited }, { data: competitions }, { data: myEntries }] =
    await Promise.all([
      admin
        .from("accreditation_requests")
        .select("id")
        .eq("startup_id", user.id)
        .eq("status", "accredited")
        .maybeSingle(),
      admin
        .from("competitions")
        .select("*")
        .in("status", ["active", "scoring", "completed"])
        .order("created_at", { ascending: false }),
      admin
        .from("competition_entries")
        .select("competition_id, score, rank, submitted_at, scored_at")
        .eq("startup_id", user.id),
    ]);

  const isAccredited = !!accredited;
  const enteredIds = new Set((myEntries ?? []).map((e) => e.competition_id));
  const entryByCompId = Object.fromEntries(
    (myEntries ?? []).map((e) => [e.competition_id, e])
  );

  return (
    <div className="max-w-[840px] mx-auto px-7 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Competitions</h1>
        <p className="text-[8px] font-mono text-cs-400 uppercase tracking-widest mt-1">
          Available Competitions — Startup Portal
        </p>
      </div>

      {!isAccredited && (
        <AlertBox variant="error" title="Accreditation required." className="mb-5">
          Only accredited startups can enter competitions. Complete your accreditation first.
        </AlertBox>
      )}

      <SectionDivider label="Open Competitions" className="mb-3" />

      {(competitions ?? []).length === 0 ? (
        <div className="border border-cs-200 bg-white px-6 py-10 text-center">
          <p className="text-[9px] font-mono text-cs-400">No competitions available right now.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {(competitions ?? []).map((comp) => {
            const status = comp.status as CompetitionStatus;
            const entered = enteredIds.has(comp.id);
            const entry = entryByCompId[comp.id];
            const canEnter = isAccredited && status === "active" && !entered;

            return (
              <div
                key={comp.id}
                className="border border-cs-200 bg-white px-5 py-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-[9px] font-bold">{comp.title}</span>
                      <span className="text-[7px] font-mono text-cs-400 uppercase tracking-widest border border-cs-200 px-1.5 py-0.5">
                        {STATUS_LABEL[status]}
                      </span>
                      {entered && (
                        <span className="text-[7px] font-mono text-sb-text font-semibold uppercase tracking-widest">
                          ✓ Entered
                        </span>
                      )}
                    </div>
                    {comp.description && (
                      <p className="text-[8px] text-cs-500 mb-2 max-w-lg">{comp.description}</p>
                    )}
                    <div className="flex gap-4 text-[7px] font-mono text-cs-400">
                      {comp.industry && <span>Industry: {comp.industry}</span>}
                      {comp.end_date && <span>Deadline: {formatDate(comp.end_date)}</span>}
                    </div>

                    {/* Score/rank if already scored */}
                    {entry?.scored_at && (
                      <div className="mt-3 flex gap-4 text-[7.5px] font-mono">
                        {entry.score != null && (
                          <span>
                            Score: <strong className="text-sb-text">{entry.score}/100</strong>
                          </span>
                        )}
                        {entry.rank != null && (
                          <span>
                            Rank: <strong>#{entry.rank}</strong>
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="shrink-0">
                    {canEnter ? (
                      <form action={enterCompetition}>
                        <input type="hidden" name="competition_id" value={comp.id} />
                        <Button type="submit" variant="accent" size="sm">
                          Enter Competition
                        </Button>
                      </form>
                    ) : entered ? (
                      <span className="text-[8px] font-mono text-cs-400 border border-cs-200 px-3 py-1.5">
                        {entry?.scored_at ? "Scored" : "Pending Scoring"}
                      </span>
                    ) : status !== "active" ? (
                      <span className="text-[8px] font-mono text-cs-400">
                        {status === "completed" ? "Closed" : "Not open"}
                      </span>
                    ) : null}
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
