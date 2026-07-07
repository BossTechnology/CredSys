import { createServiceClient } from "@/lib/supabase/service";
import { getAppDictionary }    from "@/lib/i18n/loader";
import { getTestMode }         from "@/lib/admin/test-mode";
import { TestModeControl }     from "@/components/admin/TestModeControl";
import Link                    from "next/link";

export default async function AdminOverviewPage() {
  const { locale, dict } = await getAppDictionary();
  const t = dict.admin;
  const service = createServiceClient();
  const testMode = await getTestMode();

  const { data: testStartupRows } = await service.from("startups").select("id").eq("is_test", true);
  const testStartupIds = (testStartupRows ?? []).map((s) => s.id as string);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const notTestReq = (q: any) =>
    testStartupIds.length ? q.not("startup_id", "in", `(${testStartupIds.join(",")})`) : q;

  const [
    { count: activeEvaluators  },
    { count: pendingEvaluators },
    { count: totalAccredited   },
    { count: pendingAssignment },
    { count: inProgress        },
    { count: activeComps       },
    { count: totalStartups     },
    { data:  recentRequests    },
  ] = await Promise.all([
    service.from("evaluators").select("*", { count: "exact", head: true }).eq("is_active", true).eq("is_test", false),
    service.from("evaluators").select("*", { count: "exact", head: true }).eq("is_active", false).eq("is_test", false),
    notTestReq(service.from("accreditation_requests").select("startup_id", { count: "exact", head: true }).eq("status", "accredited")),
    notTestReq(service.from("accreditation_requests").select("startup_id", { count: "exact", head: true }).eq("status", "pending_evaluator_assignment")),
    notTestReq(service.from("accreditation_requests").select("startup_id", { count: "exact", head: true })
      .in("status", ["evaluator_assigned", "meeting_scheduled", "interview_completed", "chass1s_shared",
                     "implementation_in_progress", "ready_for_verification", "verification_in_progress"])),
    service.from("competitions").select("*", { count: "exact", head: true }).eq("status", "active").eq("is_test", false),
    service.from("startups").select("*", { count: "exact", head: true }).eq("is_test", false),
    service
      .from("accreditation_requests")
      .select("id, startup_name, startup_email, status, updated_at")
      .order("updated_at", { ascending: false })
      .limit(8),
  ]);

  const stats = [
    { value: activeEvaluators  ?? 0, label: t.activeEvaluators,    href: "/admin/evaluators"                                    },
    { value: pendingEvaluators ?? 0, label: t.pendingActivation,   href: "/admin/evaluators?filter=pending", alert: (pendingEvaluators ?? 0) > 0 },
    { value: totalAccredited   ?? 0, label: t.accreditedStartups,  href: "/admin/accreditations?filter=accredited", accent: true },
    { value: pendingAssignment ?? 0, label: t.unassignedRequests,  href: "/admin/accreditations?filter=unassigned", alert: (pendingAssignment ?? 0) > 0 },
    { value: inProgress        ?? 0, label: t.inProgress,          href: "/admin/accreditations?filter=active"                   },
    { value: activeComps       ?? 0, label: t.activeCompetitions,  href: "/admin/competitions",   accent: true                  },
    { value: totalStartups     ?? 0, label: t.totalStartups,       href: "/admin/startups"                                      },
  ];

  const STATUS_COLOR: Record<string, string> = {
    pending_evaluator_assignment: "text-yellow-600",
    evaluator_assigned:           "text-blue-500",
    meeting_scheduled:            "text-blue-500",
    interview_completed:          "text-blue-500",
    chass1s_shared:               "text-blue-500",
    implementation_in_progress:   "text-blue-500",
    ready_for_verification:       "text-blue-400",
    verification_in_progress:     "text-purple-500",
    accredited:                   "text-sb-default",
    rejected:                     "text-red-500",
    expired:                      "text-cs-400",
  };

  return (
    <div className="max-w-[960px] mx-auto px-4 sm:px-7 py-8">

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-2 h-2 bg-white" />
          <span className="text-[13px] font-mono text-cs-400 uppercase tracking-widest">{t.label}</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{t.overview}</h1>
        <p className="text-[13px] font-mono text-cs-400 mt-1">{t.systemDashboard}</p>
      </div>

      <TestModeControl
        testMode={testMode}
        onLabel={t.testModeOn}
        offLabel={t.testModeOff}
        turnOnLabel={t.testModeTurnOn}
        turnOffLabel={t.testModeTurnOff}
        purgeLabel={t.purgeTest}
        purgeHint={t.purgeHint}
        purgeConfirm={t.purgeConfirm}
      />

      {/* Alert banners */}
      {((pendingEvaluators ?? 0) > 0 || (pendingAssignment ?? 0) > 0) && (
        <div className="flex flex-col gap-2 mb-6">
          {(pendingEvaluators ?? 0) > 0 && (
            <Link
              href="/admin/evaluators"
              className="bg-yellow-50 border border-yellow-200 px-4 py-2.5 flex items-center justify-between hover:bg-yellow-100 transition-colors"
            >
              <span className="text-[12px] font-mono font-bold text-yellow-700 uppercase tracking-widest">
                ⚠ {pendingEvaluators} {t.evalPendingAlert}
              </span>
              <span className="text-[12px] font-mono text-yellow-600">{t.review}</span>
            </Link>
          )}
          {(pendingAssignment ?? 0) > 0 && (
            <Link
              href="/admin/accreditations"
              className="bg-yellow-50 border border-yellow-200 px-4 py-2.5 flex items-center justify-between hover:bg-yellow-100 transition-colors"
            >
              <span className="text-[12px] font-mono font-bold text-yellow-700 uppercase tracking-widest">
                ⚠ {pendingAssignment} {t.reqAwaitingAlert}
              </span>
              <span className="text-[12px] font-mono text-yellow-600">{t.assign}</span>
            </Link>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className={`bg-white border px-4 py-4 hover:border-cs-400 transition-colors ${
              s.alert  ? "border-yellow-300 bg-yellow-50" :
              s.accent ? "border-sb-default"              :
                         "border-cs-200"
            }`}
          >
            <div className={`text-2xl font-bold tracking-tight ${
              s.alert  ? "text-yellow-700" :
              s.accent ? "text-sb-default" :
                         "text-black"
            }`}>
              {s.value}
            </div>
            <div className="text-[12px] font-mono text-cs-400 uppercase tracking-widest mt-1">
              {s.label}
            </div>
          </Link>
        ))}
      </div>

      {/* Recent requests */}
      <div className="bg-white border border-cs-200 mb-6">
        <div className="px-5 py-2 border-b border-cs-200 bg-cs-50 flex items-center justify-between">
          <span className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">{t.recentRequests}</span>
          <Link href="/admin/accreditations" className="text-[12px] font-mono text-sb-default hover:underline uppercase tracking-widest">
            {t.viewAll}
          </Link>
        </div>
        {(recentRequests ?? []).length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-[13px] font-mono text-cs-400">{t.noRequestsYet}</p>
          </div>
        ) : (
          <div className="divide-y divide-cs-100">
            {(recentRequests ?? []).map((r) => (
              <div key={r.id} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold truncate">{r.startup_name}</div>
                  <div className="text-[12px] font-mono text-cs-400 truncate">{r.startup_email}</div>
                </div>
                <div className="flex items-center gap-3 sm:gap-5 shrink-0">
                  <span className={`text-[11px] font-mono uppercase tracking-widest ${STATUS_COLOR[r.status] ?? "text-cs-400"}`}>
                    {dict.status[r.status as keyof typeof dict.status] ?? r.status.replace(/_/g, " ")}
                  </span>
                  <span className="text-[11px] font-mono text-cs-400">
                    {new Date(r.updated_at).toLocaleDateString(locale, { month: "short", day: "numeric" })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: t.activateEvaluators,  desc: t.activateEvalDesc,  href: "/admin/evaluators"     },
          { label: t.assignEvaluators,    desc: t.assignEvalDesc,    href: "/admin/accreditations" },
          { label: t.manageCompetitions,  desc: t.manageCompDesc,    href: "/admin/competitions"   },
        ].map((a) => (
          <Link
            key={a.label}
            href={a.href}
            className="bg-white border border-cs-200 px-5 py-4 hover:border-black transition-colors"
          >
            <div className="text-[13px] font-bold uppercase tracking-widest mb-1">{a.label}</div>
            <div className="text-[12px] font-mono text-cs-400">{a.desc}</div>
          </Link>
        ))}
      </div>

    </div>
  );
}
