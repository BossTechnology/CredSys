import { createServiceClient }     from "@/lib/supabase/service";
import { assignEvaluatorToRequest } from "@/app/actions/admin";
import { getAppDictionary }         from "@/lib/i18n/loader";

const STATUS_COLOR: Record<string, string> = {
  pending_evaluator_assignment: "text-yellow-600 bg-yellow-50",
  evaluator_assigned:           "text-blue-600 bg-blue-50",
  meeting_scheduled:            "text-blue-600 bg-blue-50",
  chass1s_shared:               "text-blue-600 bg-blue-50",
  implementation_in_progress:   "text-blue-600 bg-blue-50",
  ready_for_verification:       "text-purple-600 bg-purple-50",
  verification_in_progress:     "text-purple-600 bg-purple-50",
  accredited:                   "text-sb-default bg-[#1a1030]",
  rejected:                     "text-red-600 bg-red-50",
  expired:                      "text-cs-400 bg-cs-100",
};

export default async function AdminAccreditationsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const { locale, dict } = await getAppDictionary();
  const t = dict.admin;
  const service = createServiceClient();

  function fmt(iso: string | null | undefined) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" });
  }

  const FILTERS = [
    { label: t.all,        value: ""           },
    { label: t.unassigned, value: "unassigned" },
    { label: t.active,     value: "active"     },
    { label: t.accredited, value: "accredited" },
  ];

  let query = service
    .from("accreditation_requests")
    .select("id, startup_name, startup_email, industry, status, evaluator_id, acceptance_status, evaluator_decline_reason, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (filter === "unassigned") {
    query = query.eq("status", "pending_evaluator_assignment") as typeof query;
  } else if (filter === "active") {
    query = query.in("status", [
      "evaluator_assigned", "meeting_scheduled", "chass1s_shared",
      "implementation_in_progress", "ready_for_verification", "verification_in_progress",
    ]) as typeof query;
  } else if (filter === "accredited") {
    query = query.eq("status", "accredited") as typeof query;
  }

  const [{ data: requests }, { data: evaluators }] = await Promise.all([
    query,
    service.from("evaluators").select("id, org_name").eq("is_active", true).order("org_name"),
  ]);

  const evalMap = new Map((evaluators ?? []).map((e) => [e.id, e.org_name]));
  const total   = requests?.length ?? 0;

  return (
    <div className="max-w-[1060px] mx-auto px-4 sm:px-7 py-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 bg-white" />
            <span className="text-[13px] font-mono text-cs-400 uppercase tracking-widest">{t.label}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{t.accreditations}</h1>
          <p className="text-[13px] font-mono text-cs-400 mt-1">{total} {t.requests}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((tab) => (
            <a
              key={tab.label}
              href={tab.value ? `/admin/accreditations?filter=${tab.value}` : "/admin/accreditations"}
              className={`text-[12px] font-mono uppercase tracking-widest px-3 py-1.5 border transition-colors ${
                (filter ?? "") === tab.value
                  ? "bg-black text-white border-black"
                  : "bg-white text-cs-500 border-cs-200 hover:border-black"
              }`}
            >
              {tab.label}
            </a>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-cs-200 overflow-x-auto">
        <div className="px-5 py-2 border-b border-cs-200 bg-cs-50">
          <span className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
            {t.accreditations} · {total}
          </span>
        </div>

        {total === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-[13px] font-mono text-cs-400">{t.noRequestsFound}</p>
          </div>
        ) : (
          <>
            <div className="grid min-w-[760px] grid-cols-[1fr_100px_140px_200px_80px] gap-4 px-5 py-2 border-b border-cs-100 bg-cs-50">
              {[t.startup, t.industry, t.status, t.evaluator, t.submitted].map((h) => (
                <div key={h} className="text-[11px] font-mono text-cs-400 uppercase tracking-widest">{h}</div>
              ))}
            </div>
            <div className="divide-y divide-cs-100">
              {(requests ?? []).map((req) => {
                const assignedName = req.evaluator_id ? evalMap.get(req.evaluator_id) : null;
                const needsAssign  = req.status === "pending_evaluator_assignment";

                return (
                  <div
                    key={req.id}
                    className={`grid min-w-[760px] grid-cols-[1fr_100px_140px_200px_80px] gap-4 px-5 py-3 items-start ${
                      needsAssign ? "bg-yellow-50" : ""
                    }`}
                  >
                    <div>
                      <div className="text-[13px] font-semibold">{req.startup_name}</div>
                      <div className="text-[12px] font-mono text-cs-400">{req.startup_email}</div>
                    </div>

                    <div className="text-[12px] font-mono text-cs-500 capitalize pt-0.5">
                      {req.industry ?? "—"}
                    </div>

                    <div className="pt-0.5">
                      <span className={`text-[11px] font-mono font-bold uppercase tracking-widest px-1.5 py-0.5 ${STATUS_COLOR[req.status] ?? "text-cs-400 bg-cs-100"}`}>
                        {dict.status[req.status as keyof typeof dict.status] ?? req.status.replace(/_/g, " ")}
                      </span>
                    </div>

                    <div>
                      {assignedName ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[12px] font-mono text-cs-500">{assignedName}</span>
                          <span
                            className={`text-[10px] font-mono uppercase tracking-widest ${
                              req.acceptance_status === "accepted" ? "text-green-700" : "text-yellow-600"
                            }`}
                          >
                            {req.acceptance_status === "accepted" ? t.acceptanceAccepted : t.acceptancePending}
                          </span>
                        </div>
                      ) : needsAssign ? (
                        <div className="flex flex-col gap-1">
                          <form action={assignEvaluatorToRequest} className="flex gap-1.5 items-center">
                            <input type="hidden" name="request_id" value={req.id} />
                            <select
                              name="evaluator_id"
                              required
                              className="text-[12px] font-mono border border-cs-200 bg-white px-1.5 py-1 focus:outline-none focus:border-black flex-1 min-w-0"
                            >
                              <option value="">{t.select}</option>
                              {(evaluators ?? []).map((e) => (
                                <option key={e.id} value={e.id}>{e.org_name}</option>
                              ))}
                            </select>
                            <button type="submit" className="btn-primary btn-sm shrink-0">
                              {t.assignBtn}
                            </button>
                          </form>
                          {req.evaluator_decline_reason && (
                            <span className="text-[10px] font-mono text-red-600">
                              {t.declinedReasonLabel}: {req.evaluator_decline_reason}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[12px] font-mono text-cs-300">—</span>
                      )}
                    </div>

                    <div className="text-[12px] font-mono text-cs-400 pt-0.5">{fmt(req.created_at)}</div>
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
