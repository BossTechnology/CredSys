import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { StatGrid, StatCard, QuickAction } from "@/components/ui/Dashboard";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import type { AccreditationStatus } from "@/lib/supabase/types";

export default async function AcceleratorDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  const [
    { data: profile },
    { count: accreditedCount },
    { count: openCompetitions },
    { count: totalEntries },
    { data: recentAccredited },
  ] = await Promise.all([
    admin.from("profiles").select("*").eq("user_id", user.id).single(),
    admin
      .from("accreditation_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "accredited"),
    admin
      .from("competitions")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    admin
      .from("competition_entries")
      .select("*", { count: "exact", head: true }),
    admin
      .from("accreditation_requests")
      .select("id, startup_org_name, industry, accredited_at, unique_code, status")
      .eq("status", "accredited")
      .order("accredited_at", { ascending: false })
      .limit(5),
  ]);

  return (
    <div className="max-w-[900px] mx-auto px-7 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{profile?.org_name ?? "Accelerator"}</h1>
        <p className="text-[8px] font-mono text-cs-400 uppercase tracking-widest mt-1">
          Accelerator Dashboard — CredSys
        </p>
      </div>

      <SectionDivider label="Ecosystem Overview" className="mb-3" />
      <StatGrid cols={3}>
        <StatCard value={accreditedCount ?? 0} label="Accredited Startups" accent />
        <StatCard value={openCompetitions ?? 0} label="Open Competitions" accent />
        <StatCard value={totalEntries ?? 0} label="Competition Entries" />
      </StatGrid>

      <SectionDivider label="Recently Accredited" className="mt-6 mb-3" />
      {(recentAccredited ?? []).length === 0 ? (
        <div className="border border-cs-200 bg-white px-6 py-8 text-center">
          <p className="text-[9px] font-mono text-cs-400">No accredited startups yet.</p>
        </div>
      ) : (
        <div className="border border-cs-200 bg-white divide-y divide-cs-100">
          {recentAccredited!.map((r) => (
            <div key={r.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <div className="text-[8px] font-semibold">{r.startup_org_name}</div>
                {r.industry && (
                  <div className="text-[7px] font-mono text-cs-400 uppercase tracking-wider mt-0.5">
                    {r.industry}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4">
                {r.unique_code && (
                  <a
                    href={`/verify/${r.unique_code}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[7.5px] text-sb-text hover:underline"
                  >
                    {r.unique_code} ↗
                  </a>
                )}
                <span className="text-[7px] font-mono text-cs-400">
                  {r.accredited_at ? formatDate(r.accredited_at) : "—"}
                </span>
                <Badge variant={r.status as AccreditationStatus} />
              </div>
            </div>
          ))}
        </div>
      )}

      <SectionDivider label="Quick Actions" className="mt-6 mb-3" />
      <div className="grid grid-cols-2 gap-3">
        <QuickAction
          title="View Full Portfolio"
          desc="Browse all accredited startups in the ecosystem"
          href="/accelerator/portfolio"
          accent
        />
        <QuickAction
          title="Browse Competitions"
          desc="See open competitions and current entries"
          href="/accelerator/competitions"
        />
      </div>
    </div>
  );
}
