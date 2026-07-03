import { createClient }        from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect }            from "next/navigation";
import { revalidatePath }      from "next/cache";
import Link                    from "next/link";
import { getAppDictionary }    from "@/lib/i18n/loader";
import { WatchlistNotifyForm } from "@/components/investor/WatchlistNotifyForm";

// ─── Server Actions ───────────────────────────────────────────────────────────

async function addToWatchlist(formData: FormData) {
  "use server";
  const { createClient: makeClient }         = await import("@/lib/supabase/server");
  const { createServiceClient: makeService } = await import("@/lib/supabase/service");

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

  const startupId = formData.get("startup_id") as string;
  if (!startupId) return;

  // Gracefully handle unique conflict
  await service
    .from("investor_watchlist")
    .upsert(
      { investor_id: profile.entity_id, startup_id: startupId },
      { onConflict: "investor_id,startup_id", ignoreDuplicates: true }
    );

  revalidatePath("/app/investor/watchlist");
  revalidatePath("/app/investor/dashboard");
}

async function removeFromWatchlist(formData: FormData) {
  "use server";
  const { createClient: makeClient }         = await import("@/lib/supabase/server");
  const { createServiceClient: makeService } = await import("@/lib/supabase/service");

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

  const entryId = formData.get("entry_id") as string;
  if (!entryId) return;

  await service
    .from("investor_watchlist")
    .delete()
    .eq("id", entryId)
    .eq("investor_id", profile.entity_id);

  revalidatePath("/app/investor/watchlist");
  revalidatePath("/app/investor/dashboard");
}

async function updateWatchlistNotifications(formData: FormData) {
  "use server";
  const { createClient: makeClient }         = await import("@/lib/supabase/server");
  const { createServiceClient: makeService } = await import("@/lib/supabase/service");

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

  const entryId           = formData.get("entry_id") as string;
  const onAccredited      = formData.get("notify_on_accredited")      === "true";
  const onEvalAssigned    = formData.get("notify_on_evaluator_assigned") === "true";
  const onStatusChange    = formData.get("notify_on_status_change")   === "true";

  await service
    .from("investor_watchlist")
    .update({
      notify_on_accredited:         onAccredited,
      notify_on_evaluator_assigned: onEvalAssigned,
      notify_on_status_change:      onStatusChange,
    })
    .eq("id", entryId)
    .eq("investor_id", profile.entity_id);

  revalidatePath("/app/investor/watchlist");
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(iso: string | null | undefined, locale = "en") {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(locale, {
    month: "short", day: "numeric", year: "numeric",
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function InvestorWatchlistPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const { locale, dict } = await getAppDictionary();
  const t = dict.investorWatchlist;

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

  // Fetch watchlist
  const { data: watchlistEntries } = await service
    .from("investor_watchlist")
    .select(`
      id, added_at,
      notify_on_accredited,
      notify_on_evaluator_assigned,
      notify_on_status_change,
      startup_id,
      startups(id, org_name, industry, country),
      accreditation_requests(status)
    `)
    .eq("investor_id", investorId)
    .order("added_at", { ascending: false });

  // Collect watched startup IDs to exclude from search
  const watchedIds = new Set((watchlistEntries ?? []).map((e) => e.startup_id));

  // Resolve credential unique_codes for accredited startups (public page is
  // keyed by unique_code, not startup_id).
  const { data: credPages } = watchedIds.size > 0
    ? await service
        .from("cred_pages")
        .select("startup_id, unique_code")
        .in("startup_id", Array.from(watchedIds))
        .eq("is_active", true)
    : { data: [] as { startup_id: string; unique_code: string }[] };
  const credCodeMap = new Map((credPages ?? []).map((c) => [c.startup_id, c.unique_code]));

  // Search startups
  let searchResults: Array<{ id: string; org_name: string; industry: string | null; country: string | null }> = [];
  if (q?.trim()) {
    const { data } = await service
      .from("startups")
      .select("id, org_name, industry, country")
      .ilike("org_name", `%${q.trim()}%`)
      .limit(10);
    searchResults = (data ?? []).filter((s) => !watchedIds.has(s.id));
  }

  return (
    <div className="max-w-[960px] mx-auto px-4 sm:px-7 py-8">

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-2 h-2 bg-sb-default" />
          <span className="text-[13px] font-mono text-cs-400 uppercase tracking-widest">
            {t.portal}
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
        <p className="text-[13px] font-mono text-cs-400 mt-1">
          {watchlistEntries?.length ?? 0} {t.startupsWatched}
        </p>
      </div>

      {/* Add Startup Search */}
      <div className="bg-white border border-cs-200 mb-6">
        <div className="px-5 py-2 border-b border-cs-200 bg-cs-50">
          <span className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
            {t.addStartup}
          </span>
        </div>
        <div className="p-5">
          <form method="GET" className="flex items-center gap-3 mb-4">
            <input
              name="q"
              type="text"
              defaultValue={q ?? ""}
              placeholder={t.searchPH}
              className="cs-input flex-1"
            />
            <button type="submit" className="btn-primary btn-sm">
              {t.search}
            </button>
          </form>

          {q && searchResults.length === 0 && (
            <p className="text-[13px] font-mono text-cs-400">
              {t.noResults} &quot;{q}&quot;.
            </p>
          )}

          {searchResults.length > 0 && (
            <div className="divide-y divide-cs-100 border border-cs-200">
              {searchResults.map((s) => (
                <div key={s.id} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <div className="text-[13px] font-semibold">{s.org_name}</div>
                    <div className="text-[14px] font-mono text-cs-400">
                      {s.industry ?? "—"}{s.country ? ` · ${s.country}` : ""}
                    </div>
                  </div>
                  <form action={addToWatchlist}>
                    <input type="hidden" name="startup_id" value={s.id} />
                    <button type="submit" className="btn-primary btn-sm">
                      {t.watch}
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Watchlist table */}
      <div className="bg-white border border-cs-200 overflow-x-auto">
        <div className="px-5 py-2 border-b border-cs-200 bg-cs-50">
          <span className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
            {t.watching} · {watchlistEntries?.length ?? 0}
          </span>
        </div>

        {(watchlistEntries ?? []).length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-[13px] font-mono text-cs-400">
              {t.noStartups}
            </p>
          </div>
        ) : (
          <>
            <div className="grid min-w-[760px] grid-cols-[1fr_90px_80px_110px_160px_90px] gap-3 px-5 py-2 border-b border-cs-100 bg-cs-50">
              {[t.startup, t.industry, t.country, t.credStatus, t.notifications, t.actions].map((h) => (
                <div key={h} className="text-[14px] font-mono text-cs-400 uppercase tracking-widest">{h}</div>
              ))}
            </div>
            <div className="divide-y divide-cs-100">
              {(watchlistEntries ?? []).map((entry) => {
                const startup = entry.startups as unknown as {
                  id: string; org_name: string; industry: string | null; country: string | null;
                } | null;
                const reqs = entry.accreditation_requests as unknown as Array<{ status: string }> | null;
                const latestStatus = reqs?.[reqs.length - 1]?.status ?? null;
                const isAccredited = latestStatus === "accredited";
                const credCode = credCodeMap.get(entry.startup_id);

                return (
                  <div key={entry.id} className="grid min-w-[760px] grid-cols-[1fr_90px_80px_110px_160px_90px] gap-3 px-5 py-3 items-center">
                    <div>
                      <div className="text-[13px] font-semibold">
                        {isAccredited && credCode ? (
                          <Link href={`/startup/${credCode}`} className="underline underline-offset-2 hover:opacity-70">
                            {startup?.org_name ?? "—"}
                          </Link>
                        ) : (
                          startup?.org_name ?? "—"
                        )}
                      </div>
                      <div className="text-[14px] font-mono text-cs-300 mt-0.5">{t.since} {fmt(entry.added_at, locale)}</div>
                    </div>
                    <div className="text-[12px] font-mono text-cs-500 capitalize">{startup?.industry ?? "—"}</div>
                    <div className="text-[12px] font-mono text-cs-500">{startup?.country ?? "—"}</div>
                    <div>
                      <span className={`text-[14px] font-mono font-bold uppercase tracking-widest ${isAccredited ? "text-green-600" : "text-cs-400"}`}>
                        {latestStatus ? latestStatus.replace(/_/g, " ") : t.noRequest}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <WatchlistNotifyForm
                        action={updateWatchlistNotifications}
                        entryId={entry.id}
                        initial={{
                          notify_on_accredited:         entry.notify_on_accredited,
                          notify_on_evaluator_assigned: entry.notify_on_evaluator_assigned,
                          notify_on_status_change:      entry.notify_on_status_change,
                        }}
                        labels={{
                          accredited: t.notifyAccredited,
                          evaluator:  t.notifyEvaluator,
                          status:     t.notifyStatus,
                          save:       t.save,
                        }}
                      />
                    </div>
                    <div>
                      <form action={removeFromWatchlist}>
                        <input type="hidden" name="entry_id" value={entry.id} />
                        <button
                          type="submit"
                          className="text-[14px] font-mono text-red-500 hover:text-red-700 uppercase tracking-widest"
                        >
                          {t.remove}
                        </button>
                      </form>
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
