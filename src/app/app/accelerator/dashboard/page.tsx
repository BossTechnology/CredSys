import { createClient }        from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect }            from "next/navigation";
import Link                    from "next/link";
import { getAppDictionary }    from "@/lib/i18n/loader";

export default async function AcceleratorDashboardPage() {
  const { locale, dict } = await getAppDictionary();
  const t = dict.accelDash;

  function fmt(iso: string | null | undefined) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString(locale, {
      month: "short", day: "numeric", year: "numeric",
    });
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/en/login");

  const service = createServiceClient();

  const { data: userProfile } = await service
    .from("user_profiles")
    .select("entity_id")
    .eq("user_id", user.id)
    .single();

  if (!userProfile?.entity_id) redirect("/en/login");

  const acceleratorId = userProfile.entity_id;

  const [
    { data: accelerator },
    { count: credCount },
    { count: competitionCount },
    { data: recentCreds },
  ] = await Promise.all([
    service
      .from("accelerators")
      .select("org_name, industry, country, created_at")
      .eq("id", acceleratorId)
      .single(),

    // All active credentials in the ecosystem
    service
      .from("cred_pages")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),

    // Competitions owned by this accelerator
    service
      .from("competitions")
      .select("*", { count: "exact", head: true })
      .eq("accelerator_id", acceleratorId),

    // 5 most recently issued credentials
    service
      .from("cred_pages")
      .select("unique_code, accredited_at, startups(org_name, industry, country)")
      .eq("is_active", true)
      .order("accredited_at", { ascending: false })
      .limit(5),
  ]);

  const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL ?? "https://startupboss.org";

  return (
    <div className="max-w-[860px] mx-auto px-7 py-8">

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-2 h-2 bg-sb-default" />
          <span className="text-[13px] font-mono text-cs-400 uppercase tracking-widest">
            {t.portal}
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          {accelerator?.org_name ?? t.title}
        </h1>
        <p className="text-[13px] font-mono text-cs-400 mt-1">
          {accelerator?.industry ?? ""}{accelerator?.country ? ` · ${accelerator.country}` : ""}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { value: credCount ?? 0,       label: t.accreditedStartups },
          { value: competitionCount ?? 0, label: t.competitions        },
          { value: fmt(accelerator?.created_at), label: t.memberSince },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-cs-200 px-5 py-4">
            <div className="text-2xl font-bold tracking-tight">{s.value}</div>
            <div className="text-[12px] font-mono text-cs-400 uppercase tracking-widest mt-1">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Recent credentials */}
      <div className="bg-white border border-cs-200 mb-6">
        <div className="px-5 py-2 border-b border-cs-200 bg-cs-50 flex items-center justify-between">
          <span className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
            {t.recentCredentials}
          </span>
          <Link
            href="/app/accelerator/portfolio"
            className="text-[12px] font-mono text-sb-default hover:underline uppercase tracking-widest"
          >
            {t.viewAll}
          </Link>
        </div>
        {(recentCreds ?? []).length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-[13px] font-mono text-cs-400">{t.noCredentials}</p>
          </div>
        ) : (
          <div className="divide-y divide-cs-100">
            {recentCreds!.map((c) => {
              const startup = c.startups as unknown as {
                org_name: string; industry: string | null; country: string | null;
              } | null;
              return (
                <div key={c.unique_code} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <div className="text-[13px] font-semibold">{startup?.org_name ?? "—"}</div>
                    <div className="text-[14px] font-mono text-cs-400 mt-0.5">
                      {startup?.industry ?? ""}{startup?.country ? ` · ${startup.country}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-5">
                    <span className="text-[12px] font-mono text-cs-400">{fmt(c.accredited_at)}</span>
                    <a
                      href={`${portalUrl}/startup/${c.unique_code}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12px] font-mono text-sb-default hover:underline font-bold"
                    >
                      {c.unique_code} ↗
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/app/accelerator/portfolio"
          className="bg-white border border-cs-200 px-5 py-4 hover:border-cs-400 transition-colors"
        >
          <div className="text-[13px] font-bold uppercase tracking-widest mb-1">
            {t.startupPortfolio}
          </div>
          <div className="text-[12px] font-mono text-cs-400">
            {t.browseStartups}
          </div>
        </Link>
        <Link
          href="/app/accelerator/competitions"
          className="bg-white border border-cs-200 px-5 py-4 hover:border-cs-400 transition-colors"
        >
          <div className="text-[13px] font-bold uppercase tracking-widest mb-1">
            {t.competitions}
          </div>
          <div className="text-[12px] font-mono text-cs-400">
            {t.manageCompetitions}
          </div>
        </Link>
      </div>

    </div>
  );
}
