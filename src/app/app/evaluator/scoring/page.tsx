import { createClient }        from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect }            from "next/navigation";
import { revalidatePath }      from "next/cache";

// ─── Server Action ────────────────────────────────────────────────────────────

async function submitScore(formData: FormData) {
  "use server";

  const { createClient: makeClient } = await import("@/lib/supabase/server");
  const { createServiceClient: makeService } = await import("@/lib/supabase/service");
  const { sendEntryScored } = await import("@/lib/email/templates/e8-entry-scored");

  const supabase = await makeClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const service = makeService();
  const { data: profile } = await service
    .from("user_profiles")
    .select("entity_id")
    .eq("user_id", user.id)
    .single();

  if (!profile?.entity_id) return;

  const competitionId = formData.get("competition_id") as string;
  const startupId     = formData.get("startup_id")     as string;
  const score         = Number(formData.get("score"));
  const notes         = (formData.get("notes") as string) || null;

  if (!competitionId || !startupId || isNaN(score)) return;

  // Upsert score (unique constraint: competition_id + startup_id + evaluator_id)
  await service
    .from("competition_scores")
    .upsert(
      {
        competition_id: competitionId,
        startup_id:     startupId,
        evaluator_id:   profile.entity_id,
        score,
        notes,
        scored_at:      new Date().toISOString(),
      },
      { onConflict: "competition_id,startup_id,evaluator_id" }
    );

  // Fire E8 email to the startup (fire-and-forget)
  const { data: startup } = await service
    .from("startups")
    .select("email, org_name")
    .eq("id", startupId)
    .single();

  const { data: competition } = await service
    .from("competitions")
    .select("name")
    .eq("id", competitionId)
    .single();

  if (startup && competition) {
    sendEntryScored(
      startup.email,
      startup.org_name,
      competition.name,
      score
    ).catch((e) => console.error("[scoring] email error:", e));
  }

  revalidatePath("/app/evaluator/scoring");
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function EvaluatorScoringPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/en/login");

  const service = createServiceClient();

  const { data: profile } = await service
    .from("user_profiles")
    .select("entity_id")
    .eq("user_id", user.id)
    .single();

  if (!profile?.entity_id) redirect("/en/login");

  // Get all competition_startups this evaluator is assigned to evaluate
  // via competition_evaluators table
  const { data: evalComps } = await service
    .from("competition_evaluators")
    .select("competition_id")
    .eq("evaluator_id", profile.entity_id);

  const compIds = (evalComps ?? []).map((r) => r.competition_id);

  if (compIds.length === 0) {
    return <EmptyState />;
  }

  // Get all startups in those competitions
  const { data: compStartups } = await service
    .from("competition_startups")
    .select("competition_id, startup_id, entered_at, startups(org_name, email), competitions(id, name, status)")
    .in("competition_id", compIds)
    .order("entered_at", { ascending: true });

  // Get existing scores by this evaluator
  const { data: existingScores } = await service
    .from("competition_scores")
    .select("competition_id, startup_id, score, notes, scored_at")
    .eq("evaluator_id", profile.entity_id);

  // Build scored lookup: "compId:startupId" → score row
  const scoredMap = new Map<string, { score: number; notes: string | null; scored_at: string }>(
    (existingScores ?? []).map((s) => [
      `${s.competition_id}:${s.startup_id}`,
      { score: s.score, notes: s.notes, scored_at: s.scored_at },
    ])
  );

  const pending = (compStartups ?? []).filter(
    (r) => !scoredMap.has(`${r.competition_id}:${r.startup_id}`)
  );
  const scored = (compStartups ?? []).filter(
    (r) => scoredMap.has(`${r.competition_id}:${r.startup_id}`)
  );

  return (
    <div className="max-w-[900px] mx-auto px-7 py-8">

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-2 h-2 bg-sb-default" />
          <span className="text-[13px] font-mono text-cs-400 uppercase tracking-widest">
            Evaluator Portal
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Competition Scoring</h1>
        <p className="text-[13px] font-mono text-cs-400 mt-1">
          {pending.length} pending · {scored.length} scored
        </p>
      </div>

      {/* Pending */}
      <div className="border border-cs-200 bg-white mb-8">
        <div className="px-5 py-2 border-b border-cs-200 bg-cs-50">
          <span className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
            Pending Scoring
          </span>
        </div>

        {pending.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-[13px] font-mono text-cs-400 uppercase tracking-widest">
              All entries have been scored ✓
            </p>
          </div>
        ) : (
          pending.map((entry) => {
            const startup = (entry.startups as unknown as { org_name: string; email: string } | null);
            const comp    = (entry.competitions as unknown as { id: string; name: string } | null);
            return (
              <div
                key={`${entry.competition_id}:${entry.startup_id}`}
                className="px-5 py-4 border-b border-cs-100 flex items-start justify-between gap-6"
              >
                <div>
                  <div className="text-[13px] font-semibold mb-0.5">
                    {startup?.org_name ?? "Unknown Startup"}
                  </div>
                  <div className="text-[14px] font-mono text-cs-400">
                    {comp?.name ?? "—"} · Entered {fmt(entry.entered_at)}
                  </div>
                </div>

                <form action={submitScore} className="flex items-end gap-3 shrink-0">
                  <input type="hidden" name="competition_id" value={entry.competition_id} />
                  <input type="hidden" name="startup_id"     value={entry.startup_id} />
                  <div>
                    <label className="text-[14px] font-mono text-cs-400 uppercase tracking-widest block mb-1">
                      Notes
                    </label>
                    <input
                      name="notes"
                      type="text"
                      placeholder="Optional…"
                      className="w-36 border border-cs-200 bg-cs-50 px-2 py-1.5 text-[12px] font-mono focus:outline-none focus:border-black"
                    />
                  </div>
                  <div>
                    <label className="text-[14px] font-mono text-cs-400 uppercase tracking-widest block mb-1">
                      Score (0–100)
                    </label>
                    <input
                      name="score"
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      required
                      placeholder="85"
                      className="w-20 border border-cs-200 bg-cs-50 px-2 py-1.5 text-[13px] font-mono focus:outline-none focus:border-black"
                    />
                  </div>
                  <button type="submit" className="btn-accent btn-sm">
                    Submit
                  </button>
                </form>
              </div>
            );
          })
        )}
      </div>

      {/* Scored */}
      {scored.length > 0 && (
        <div className="border border-cs-200 bg-white">
          <div className="px-5 py-2 border-b border-cs-200 bg-cs-50">
            <span className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
              Scored Entries
            </span>
          </div>
          {scored.map((entry) => {
            const startup  = (entry.startups as unknown as { org_name: string } | null);
            const comp     = (entry.competitions as unknown as { name: string } | null);
            const scoreRow = scoredMap.get(`${entry.competition_id}:${entry.startup_id}`)!;
            return (
              <div
                key={`${entry.competition_id}:${entry.startup_id}`}
                className="px-5 py-3 border-b border-cs-100 flex items-center justify-between"
              >
                <div>
                  <div className="text-[13px] font-semibold">{startup?.org_name ?? "—"}</div>
                  <div className="text-[14px] font-mono text-cs-400">{comp?.name ?? "—"}</div>
                </div>
                <div className="flex items-center gap-6">
                  {scoreRow.notes && (
                    <span className="text-[14px] font-mono text-cs-400 max-w-[160px] truncate">
                      {scoreRow.notes}
                    </span>
                  )}
                  <div className="text-right">
                    <div className="text-[14px] font-mono text-cs-400 uppercase tracking-widest">Score</div>
                    <div className="text-[13px] font-bold text-sb-text">{scoreRow.score}/100</div>
                  </div>
                  <div className="text-[14px] font-mono text-cs-400">
                    {fmt(scoreRow.scored_at)}
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

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="max-w-[900px] mx-auto px-7 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Competition Scoring</h1>
      </div>
      <div className="border border-cs-200 bg-white px-5 py-10 text-center">
        <p className="text-[13px] font-mono text-cs-400 uppercase tracking-widest">
          You have not been assigned to any active competitions yet.
        </p>
      </div>
    </div>
  );
}
