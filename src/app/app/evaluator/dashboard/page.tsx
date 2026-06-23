import { createClient }        from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect }            from "next/navigation";
import Link                    from "next/link";
import { Badge }               from "@/components/ui/Badge";
import { getAppDictionary }    from "@/lib/i18n/loader";
import type { AccreditationStatus } from "@/lib/supabase/types";

// ─── Types ───────────────────────────────────────────────────────────────────

type Assignment = {
  id:           string;
  status:       AccreditationStatus;
  startup_name: string;
  startup_email:string;
  industry:     string;
  updated_at:   string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TERMINAL: AccreditationStatus[] = ["accredited", "rejected", "expired"];

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function EvaluatorDashboardPage() {
  const { locale, dict } = await getAppDictionary();
  const t = dict.evalDash;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/en/login");

  const service = createServiceClient();

  // Resolve the evaluator entity_id from user_profiles
  const { data: profile } = await service
    .from("user_profiles")
    .select("entity_id")
    .eq("user_id", user.id)
    .single();

  if (!profile?.entity_id) redirect("/en/login");

  const { data: rows } = await service
    .from("accreditation_requests")
    .select("id, status, startup_name, startup_email, industry, updated_at")
    .eq("evaluator_id", profile.entity_id)
    .order("updated_at", { ascending: false });

  const assignments = (rows ?? []) as Assignment[];
  const total      = assignments.length;
  const active     = assignments.filter((a) => !TERMINAL.includes(a.status)).length;
  const accredited = assignments.filter((a) => a.status === "accredited").length;
  const actionNeeded = assignments.filter((a) => a.status === "evaluator_assigned").length;

  function formatShort(iso: string) {
    return new Date(iso).toLocaleDateString(locale, {
      month: "short", day: "numeric", year: "numeric",
    });
  }

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-7 py-8">

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-2 h-2 bg-sb-default" />
          <span className="text-[13px] font-mono text-cs-400 uppercase tracking-widest">
            {t.portalLabel}
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 border border-cs-200 bg-white mb-8">
        {[
          { label: t.totalAssignments, value: total, accent: false },
          { label: t.activeLabel,      value: active, accent: false },
          { label: t.accreditedLabel,  value: accredited, accent: true },
          { label: t.actionNeeded,     value: actionNeeded, alert: actionNeeded > 0 },
        ].map((s, i) => (
          <div
            key={s.label}
            className={`px-6 py-5 border-b sm:border-b-0 last:border-b-0 ${i % 2 === 0 ? "border-r border-cs-200" : ""} ${i < 2 ? "sm:border-r sm:border-cs-200" : ""}`}
          >
            <div className="text-[12px] font-mono text-cs-400 uppercase tracking-widest mb-1">
              {s.label}
            </div>
            <div
              className={`text-2xl font-bold tracking-tight ${
                s.accent ? "text-sb-text" :
                s.alert  ? "text-red-600" : "text-black"
              }`}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Assignments table */}
      <div className="border border-cs-200 bg-white overflow-x-auto">
        <div className="px-5 py-3 border-b border-cs-200 bg-cs-50 flex items-center justify-between">
          <div>
            <span className="text-[13px] font-mono text-cs-400 uppercase tracking-widest">
              {t.myAssignments}
            </span>
          </div>
          <span className="text-[12px] font-mono text-cs-400">{total} {t.totalSuffix}</span>
        </div>

        {assignments.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-[13px] font-mono text-cs-400 uppercase tracking-widest">
              {t.noAssignments}
            </p>
          </div>
        ) : (
          <>
            {/* Column headers */}
            <div className="grid min-w-[660px] grid-cols-[1fr_120px_160px_120px_80px] px-5 py-2 border-b border-cs-100 bg-cs-50">
              {[t.colStartup, t.colIndustry, t.colStatus, t.colUpdated, ""].map((h) => (
                <span key={h} className="text-[11px] font-mono text-cs-400 uppercase tracking-widest">
                  {h}
                </span>
              ))}
            </div>

            {assignments.map((a) => (
              <div
                key={a.id}
                className={`grid min-w-[660px] grid-cols-[1fr_120px_160px_120px_80px] px-5 py-3 border-b border-cs-100 items-center hover:bg-cs-50 transition-colors ${
                  a.status === "evaluator_assigned" ? "bg-sb-light/30" : ""
                }`}
              >
                <div>
                  <div className="text-[13px] font-semibold">{a.startup_name}</div>
                  <div className="text-[12px] font-mono text-cs-400">{a.startup_email}</div>
                </div>
                <span className="text-[13px] font-mono text-cs-500 capitalize">
                  {a.industry || "—"}
                </span>
                <div>
                  <Badge variant={a.status}>{dict.status[a.status]}</Badge>
                </div>
                <span className="text-[12px] font-mono text-cs-400">
                  {formatShort(a.updated_at)}
                </span>
                <Link
                  href={`/app/evaluator/assignments/${a.id}`}
                  className="text-[12px] font-mono cs-link underline-offset-2"
                >
                  {t.view}
                </Link>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
