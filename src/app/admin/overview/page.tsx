import { createClient } from "@/lib/supabase/server";
import { SectionDivider, MetricStrip } from "@/components/ui/SectionDivider";
import { StatGrid, StatCard, KBRCard, QuickAction } from "@/components/ui/Dashboard";

export default async function AdminOverviewPage() {
  const supabase = await createClient();

  const [
    { count: totalEvaluators },
    { count: pendingEvaluators },
    { count: totalAccredited },
    { count: pendingReview },
    { count: unassigned },
    { count: totalCompetitions },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "evaluator").eq("is_active", true),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "evaluator").eq("is_active", false),
    supabase.from("accreditation_requests").select("*", { count: "exact", head: true }).eq("status", "accredited"),
    supabase.from("accreditation_requests").select("*", { count: "exact", head: true }).eq("status", "submitted"),
    supabase.from("accreditation_requests").select("*", { count: "exact", head: true }).eq("status", "submitted").is("evaluator_id", null),
    supabase.from("competitions").select("*", { count: "exact", head: true }).eq("status", "active"),
  ]);

  return (
    <div className="max-w-[1280px] mx-auto px-7 py-6">
      {/* Page title */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold">Admin Overview</h1>
        <p className="text-[8px] font-mono text-cs-400 uppercase tracking-widest mt-1">
          System Dashboard — CredSys
        </p>
      </div>

      {/* Metric strip */}
      <MetricStrip
        items={[
          { value: totalEvaluators ?? 0, label: "Evaluators Active" },
          { value: pendingEvaluators ?? 0, label: "Pending Review", alert: (pendingEvaluators ?? 0) > 0 },
          { value: totalAccredited ?? 0, label: "Accredited" },
          { value: unassigned ?? 0, label: "Unassigned", alert: (unassigned ?? 0) > 0 },
          { value: totalCompetitions ?? 0, label: "Competitions" },
        ]}
      />

      {/* Stats grid */}
      <div className="mt-5 mb-5">
        <SectionDivider label="Key Metrics" className="mb-3" />
        <StatGrid cols={5}>
          <StatCard value={totalEvaluators ?? 0} label="Evaluators Active" />
          <StatCard
            value={pendingEvaluators ?? 0}
            label="Pending Review"
            alert={(pendingEvaluators ?? 0) > 0}
            alertText={(pendingEvaluators ?? 0) > 0 ? "Action Needed" : undefined}
          />
          <StatCard value={totalAccredited ?? 0} label="Accredited" accent />
          <StatCard
            value={unassigned ?? 0}
            label="Unassigned"
            alert={(unassigned ?? 0) > 0}
            alertText={(unassigned ?? 0) > 0 ? "Action Needed" : undefined}
          />
          <StatCard value={totalCompetitions ?? 0} label="Competitions" accent />
        </StatGrid>
      </div>

      {/* KBR Cards */}
      <div className="mb-5">
        <SectionDivider label="Key Business Results" className="mb-3" />
        <div className="grid grid-cols-3 gap-px bg-cs-200">
          <KBRCard
            title="Accreditations Completed"
            metric={`${totalAccredited ?? 0} / ${(totalAccredited ?? 0) + (pendingReview ?? 0)}`}
            metricLabel="Total accredited / total submitted"
            objective="80% completion rate"
            objectiveLabel="Objective"
          />
          <KBRCard
            title="Active Competitions"
            metric={String(totalCompetitions ?? 0)}
            metricLabel="Active competitions this quarter"
            objective="2 per quarter target"
            objectiveLabel="Target"
            variant="accent"
          />
          <KBRCard
            title="Unassigned Requests"
            metric={String(unassigned ?? 0)}
            metricLabel="Requests awaiting evaluator"
            objective="0 unassigned at all times"
            objectiveLabel="Objective"
            variant={unassigned ? "alert" : "default"}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <SectionDivider label="Quick Actions" className="mb-3" />
        <div className="grid grid-cols-3 gap-3">
          <QuickAction
            title="Review Pending Evaluators"
            desc="Activate new Evaluator organizations"
            href="/admin/evaluators?filter=pending"
          />
          <QuickAction
            title="Assign Competition Evaluators"
            desc="Match Evaluators to competitions"
            href="/admin/competitions"
            accent
          />
          <QuickAction
            title="Review Unassigned Requests"
            desc={`${unassigned ?? 0} requests need manual assignment`}
            href="/admin/accreditations?filter=unassigned"
            alert={(unassigned ?? 0) > 0}
          />
        </div>
      </div>
    </div>
  );
}
