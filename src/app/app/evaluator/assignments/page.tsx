import { createClient }        from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect }            from "next/navigation";
import Link                    from "next/link";
import { getAppDictionary }    from "@/lib/i18n/loader";

const STATUS_COLOR: Record<string, string> = {
  evaluator_assigned:         "text-blue-600 bg-blue-50",
  meeting_scheduled:          "text-blue-600 bg-blue-50",
  interview_completed:        "text-blue-600 bg-blue-50",
  chass1s_shared:             "text-blue-600 bg-blue-50",
  implementation_in_progress: "text-blue-600 bg-blue-50",
  ready_for_verification:     "text-purple-600 bg-purple-50",
  verification_in_progress:   "text-purple-600 bg-purple-50",
  accredited:                 "text-green-700 bg-green-50",
  rejected:                   "text-red-600 bg-red-50",
  expired:                    "text-cs-400 bg-cs-100",
};

const TERMINAL = ["accredited", "rejected", "expired"];

export default async function EvaluatorAssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const { locale, dict } = await getAppDictionary();
  const t = dict.evalAssignments;

  const FILTERS = [
    { label: t.all,    value: ""         },
    { label: t.active, value: "active"   },
    { label: t.done,   value: "done"     },
  ];

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

  let query = service
    .from("accreditation_requests")
    .select("id, status, startup_name, startup_email, industry, created_at, updated_at, acceptance_status")
    .eq("evaluator_id", profile.entity_id)
    .order("updated_at", { ascending: false });

  if (filter === "active") {
    query = query.not("status", "in", '("accredited","rejected","expired")') as typeof query;
  } else if (filter === "done") {
    query = query.in("status", ["accredited", "rejected", "expired"]) as typeof query;
  }

  const { data: rows } = await query;
  const assignments = rows ?? [];
  const total = assignments.length;

  function fmt(iso: string) {
    return new Date(iso).toLocaleDateString(locale, {
      month: "short", day: "numeric", year: "numeric",
    });
  }

  return (
    <div className="max-w-[1060px] mx-auto px-4 sm:px-7 py-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 bg-sb-default" />
            <span className="text-[13px] font-mono text-cs-400 uppercase tracking-widest">
              {t.portalLabel}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
          <p className="text-[13px] font-mono text-cs-400 mt-1">{total} {t.requests}</p>
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((tab) => (
            <Link
              key={tab.label}
              href={tab.value ? `/app/evaluator/assignments?filter=${tab.value}` : "/app/evaluator/assignments"}
              className={`text-[12px] font-mono uppercase tracking-widest px-3 py-1.5 border transition-colors ${
                (filter ?? "") === tab.value
                  ? "bg-black text-white border-black"
                  : "bg-white text-cs-500 border-cs-200 hover:border-black"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-cs-200 overflow-x-auto">
        <div className="px-5 py-2 border-b border-cs-200 bg-cs-50">
          <span className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
            {t.assignedStartups} · {total}
          </span>
        </div>

        {total === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-[13px] font-mono text-cs-400 uppercase tracking-widest">
              {filter === "active"
                ? t.noActive
                : filter === "done"
                ? t.noDone
                : t.noRequests}
            </p>
          </div>
        ) : (
          <>
            <div className="grid min-w-[700px] grid-cols-[1fr_110px_160px_110px_70px] gap-4 px-5 py-2 border-b border-cs-100 bg-cs-50">
              {[t.colStartup, t.colIndustry, t.colStatus, t.colUpdated, ""].map((h) => (
                <div key={h} className="text-[11px] font-mono text-cs-400 uppercase tracking-widest">{h}</div>
              ))}
            </div>

            <div className="divide-y divide-cs-100">
              {assignments.map((a) => {
                const isActive = !TERMINAL.includes(a.status);
                return (
                  <div
                    key={a.id}
                    className={`grid min-w-[700px] grid-cols-[1fr_110px_160px_110px_70px] gap-4 px-5 py-3 items-center ${
                      a.status === "evaluator_assigned" ? "bg-blue-50/40" : ""
                    }`}
                  >
                    <div>
                      <div className="text-[13px] font-semibold">{a.startup_name}</div>
                      <div className="text-[12px] font-mono text-cs-400">{a.startup_email}</div>
                    </div>

                    <div className="text-[12px] font-mono text-cs-500 capitalize">
                      {a.industry ?? "—"}
                    </div>

                    <div>
                      <span className={`text-[11px] font-mono font-bold uppercase tracking-widest px-1.5 py-0.5 ${STATUS_COLOR[a.status] ?? "text-cs-400 bg-cs-100"}`}>
                        {dict.status[a.status as keyof typeof dict.status] ?? a.status.replace(/_/g, " ")}
                      </span>
                      {a.acceptance_status === "pending" && (
                        <div className="text-[10px] font-mono text-sb-text uppercase tracking-widest mt-1">
                          {dict.evalDash.pendingAcceptance}
                        </div>
                      )}
                    </div>

                    <div className="text-[12px] font-mono text-cs-400">{fmt(a.updated_at)}</div>

                    <div>
                      {isActive ? (
                        <Link
                          href={`/app/evaluator/assignments/${a.id}`}
                          className="text-[12px] font-mono font-bold cs-link underline-offset-2"
                        >
                          {t.review}
                        </Link>
                      ) : (
                        <Link
                          href={`/app/evaluator/assignments/${a.id}`}
                          className="text-[12px] font-mono text-cs-400 hover:text-black transition-colors"
                        >
                          {t.viewDetails}
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

    </div>
  );
}
