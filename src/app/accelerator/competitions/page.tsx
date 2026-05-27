import { createServiceClient } from "@/lib/supabase/service";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import type { CompetitionStatus } from "@/lib/supabase/types";

const STATUS_LABEL: Record<CompetitionStatus, string> = {
  draft: "Draft",
  active: "Open for Entries",
  scoring: "Scoring",
  completed: "Completed",
};

const STATUS_COLOR: Record<CompetitionStatus, string> = {
  draft: "text-cs-400",
  active: "text-sb-text font-semibold",
  scoring: "text-amber-600 font-semibold",
  completed: "text-cs-600",
};

export default async function AcceleratorCompetitionsPage() {
  const admin = createServiceClient();

  const { data: competitions } = await admin
    .from("competitions")
    .select("*")
    .order("created_at", { ascending: false });

  // Get entry counts per competition
  const competitionIds = (competitions ?? []).map((c) => c.id);
  const entryCounts: Record<string, number> = {};

  if (competitionIds.length > 0) {
    const { data: entries } = await admin
      .from("competition_entries")
      .select("competition_id")
      .in("competition_id", competitionIds);

    (entries ?? []).forEach((e) => {
      entryCounts[e.competition_id] = (entryCounts[e.competition_id] ?? 0) + 1;
    });
  }

  const active = (competitions ?? []).filter((c) => c.status === "active").length;
  const total = competitions?.length ?? 0;

  return (
    <div className="max-w-[1000px] mx-auto px-7 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Competitions</h1>
        <p className="text-[8px] font-mono text-cs-400 uppercase tracking-widest mt-1">
          {active} Open · {total} Total
        </p>
      </div>

      <SectionDivider label="Competition Roster" className="mb-3" />

      {total === 0 ? (
        <div className="border border-cs-200 bg-white px-6 py-10 text-center">
          <p className="text-[9px] font-mono text-cs-400">No competitions available yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {(competitions ?? []).map((comp) => {
            const status = comp.status as CompetitionStatus;
            const entries = entryCounts[comp.id] ?? 0;
            return (
              <div
                key={comp.id}
                className="border border-cs-200 bg-white px-5 py-4 flex items-start justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-[9px] font-bold">{comp.title}</span>
                    <span className={`text-[7.5px] font-mono uppercase tracking-widest ${STATUS_COLOR[status]}`}>
                      {STATUS_LABEL[status]}
                    </span>
                  </div>
                  {comp.description && (
                    <p className="text-[8px] text-cs-500 mb-2 max-w-xl">{comp.description}</p>
                  )}
                  <div className="flex gap-4 text-[7px] font-mono text-cs-400">
                    {comp.industry && <span>Industry: {comp.industry}</span>}
                    {comp.start_date && <span>Start: {formatDate(comp.start_date)}</span>}
                    {comp.end_date && <span>End: {formatDate(comp.end_date)}</span>}
                  </div>
                </div>
                <div className="text-right ml-6 shrink-0">
                  <div className="text-2xl font-bold text-sb-text">{entries}</div>
                  <div className="text-[7px] font-mono text-cs-400 uppercase tracking-widest">
                    Entries
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
