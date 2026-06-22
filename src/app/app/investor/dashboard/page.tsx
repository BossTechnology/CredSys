import { createClient }        from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect }            from "next/navigation";
import Link                    from "next/link";
import { getAppDictionary }    from "@/lib/i18n/loader";

function fmt(iso: string | null | undefined, locale = "en") {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(locale, {
    month: "short", day: "numeric", year: "numeric",
  });
}

const STATUS_COLORS: Record<string, string> = {
  pending_startup_acceptance: "text-yellow-600",
  accepted:   "text-blue-600",
  declined:   "text-red-500",
  cancelled:  "text-cs-400",
  completed:  "text-green-600",
};

export default async function InvestorDashboardPage() {
  const { locale, dict } = await getAppDictionary();
  const t = dict.investorDash;

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

  const investorId = profile.entity_id;

  const [
    { data: investor },
    { data: watchlistEntries },
    { data: recentSponsorships },
  ] = await Promise.all([
    service
      .from("investors")
      .select("org_name, investment_focus, country, created_at")
      .eq("id", investorId)
      .single(),

    service
      .from("investor_watchlist")
      .select(`
        id,
        added_at,
        startup_id,
        startups(id, org_name, industry, country),
        accreditation_requests(status)
      `)
      .eq("investor_id", investorId)
      .order("added_at", { ascending: false }),

    service
      .from("accreditation_sponsorships")
      .select("id, startup_name_input, status, created_at, notes")
      .eq("sponsor_investor_id", investorId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  // Compute stats
  const totalWatching = watchlistEntries?.length ?? 0;
  const accreditedCount = watchlistEntries?.filter((w) => {
    const reqs = w.accreditation_requests as unknown as Array<{ status: string }> | null;
    return reqs?.some((r) => r.status === "accredited");
  }).length ?? 0;
  const pendingCount = watchlistEntries?.filter((w) => {
    const reqs = w.accreditation_requests as unknown as Array<{ status: string }> | null;
    const terminal = ["accredited", "rejected", "expired"];
    return reqs?.some((r) => !terminal.includes(r.status));
  }).length ?? 0;
  const sponsorshipsCount = recentSponsorships?.length ?? 0;

  return (
    <div className="max-w-[1060px] mx-auto px-7 py-8">

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-2 h-2 bg-sb-default" />
          <span className="text-[13px] font-mono text-cs-400 uppercase tracking-widest">
            {t.portal}
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          {investor?.org_name ?? t.title}
        </h1>
        <p className="text-[13px] font-mono text-cs-400 mt-1">{user.email}</p>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        {[
          { value: totalWatching,    label: t.startupsWatching  },
          { value: accreditedCount,  label: t.accredited        },
          { value: pendingCount,     label: t.pending           },
          { value: sponsorshipsCount, label: t.sponsorships     },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-cs-200 px-5 py-4">
            <div className="text-2xl font-bold tracking-tight">{s.value}</div>
            <div className="text-[12px] font-mono text-cs-400 uppercase tracking-widest mt-1">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Watchlist card */}
          <div className="bg-white border border-cs-200">
            <div className="px-5 py-3 border-b border-cs-200 bg-cs-50 flex items-center justify-between">
              <span className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
                {t.watchlist}
              </span>
              <Link
                href="/app/investor/watchlist"
                className="text-[12px] font-mono text-sb-default hover:underline uppercase tracking-widest"
              >
                {t.manage} →
              </Link>
            </div>

            {totalWatching === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-[13px] font-mono text-cs-400 mb-3">
                  {t.noWatchlist}
                </p>
                <Link href="/en/cred-list" className="btn-outline btn-sm">
                  {t.browseCredList}
                </Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-[1fr_100px_80px_100px_80px] gap-3 px-5 py-2 border-b border-cs-100 bg-cs-50">
                  {[t.startup, t.industry, t.country, t.credStatus, ""].map((h) => (
                    <div key={h} className="text-[14px] font-mono text-cs-400 uppercase tracking-widest">{h}</div>
                  ))}
                </div>
                <div className="divide-y divide-cs-100">
                  {(watchlistEntries ?? []).slice(0, 8).map((entry) => {
                    const startup = entry.startups as unknown as {
                      id: string; org_name: string; industry: string | null; country: string | null;
                    } | null;
                    const reqs = entry.accreditation_requests as unknown as Array<{ status: string }> | null;
                    const latestStatus = reqs?.[reqs.length - 1]?.status ?? null;
                    const isAccredited = latestStatus === "accredited";

                    return (
                      <div key={entry.id} className="grid grid-cols-[1fr_100px_80px_100px_80px] gap-3 px-5 py-3 items-center">
                        <div className="text-[13px] font-semibold">
                          {isAccredited ? (
                            <Link href={`/startup/${entry.startup_id}`} className="underline underline-offset-2 hover:opacity-70">
                              {startup?.org_name ?? "—"}
                            </Link>
                          ) : (
                            startup?.org_name ?? "—"
                          )}
                        </div>
                        <div className="text-[12px] font-mono text-cs-500 capitalize">{startup?.industry ?? "—"}</div>
                        <div className="text-[12px] font-mono text-cs-500">{startup?.country ?? "—"}</div>
                        <div>
                          <span className={`text-[14px] font-mono font-bold uppercase tracking-widest ${isAccredited ? "text-green-600" : "text-cs-400"}`}>
                            {latestStatus ? latestStatus.replace(/_/g, " ") : t.noRequest}
                          </span>
                        </div>
                        <div>
                          <Link
                            href="/app/investor/watchlist"
                            className="text-[14px] font-mono text-cs-400 hover:text-black uppercase tracking-widest"
                          >
                            {t.manage}
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Recent Sponsorships card */}
          <div className="bg-white border border-cs-200">
            <div className="px-5 py-3 border-b border-cs-200 bg-cs-50 flex items-center justify-between">
              <span className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
                {t.recentSponsorships}
              </span>
              <Link
                href="/app/investor/sponsor"
                className="text-[12px] font-mono text-sb-default hover:underline uppercase tracking-widest"
              >
                {t.newSponsorship}
              </Link>
            </div>

            {sponsorshipsCount === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-[13px] font-mono text-cs-400 mb-3">
                  {t.noSponsorships}
                </p>
                <Link href="/app/investor/sponsor" className="btn-outline btn-sm">
                  {t.sponsorAccreditation}
                </Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-[1fr_80px_100px_60px] gap-3 px-5 py-2 border-b border-cs-100 bg-cs-50">
                  {[t.startup, t.date, t.status, ""].map((h) => (
                    <div key={h} className="text-[14px] font-mono text-cs-400 uppercase tracking-widest">{h}</div>
                  ))}
                </div>
                <div className="divide-y divide-cs-100">
                  {(recentSponsorships ?? []).map((s) => (
                    <div key={s.id} className="grid grid-cols-[1fr_80px_100px_60px] gap-3 px-5 py-3 items-center">
                      <div className="text-[13px] font-semibold">{s.startup_name_input}</div>
                      <div className="text-[12px] font-mono text-cs-400">{fmt(s.created_at, locale)}</div>
                      <div>
                        <span className={`text-[14px] font-mono font-bold uppercase tracking-widest ${STATUS_COLORS[s.status] ?? "text-cs-400"}`}>
                          {s.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      <Link
                        href="/app/investor/sponsor"
                        className="text-[14px] font-mono text-cs-400 hover:text-black uppercase tracking-widest"
                      >
                        {t.view}
                      </Link>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

        </div>

        {/* Right — quick links */}
        <div className="flex flex-col gap-4">
          <div className="border border-cs-200 bg-white">
            <div className="px-5 py-3 border-b border-cs-200 bg-cs-50">
              <span className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
                {t.quickLinks}
              </span>
            </div>
            <div className="p-4 flex flex-col gap-2">
              <Link href="/app/investor/sponsor" className="btn-outline btn-sm w-full text-center">
                {t.sponsorAnAccreditation}
              </Link>
              <Link href="/en/cred-list" className="btn-outline btn-sm w-full text-center">
                {t.browseCREDList}
              </Link>
              <Link href="/app/investor/profile" className="btn-outline btn-sm w-full text-center">
                {t.editProfile}
              </Link>
            </div>
          </div>

          <div className="border border-cs-200 bg-white">
            <div className="px-5 py-3 border-b border-cs-200 bg-cs-50">
              <span className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
                {t.investorInfo}
              </span>
            </div>
            <div className="p-5 flex flex-col gap-3">
              {[
                { label: t.focus,   value: investor?.investment_focus },
                { label: t.country, value: investor?.country          },
                { label: t.since,   value: fmt(investor?.created_at, locale)  },
              ].map((f) => (
                <div key={f.label}>
                  <div className="text-[14px] font-mono text-cs-400 uppercase tracking-widest mb-0.5">
                    {f.label}
                  </div>
                  <div className="text-[13px] font-semibold">{f.value || "—"}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
