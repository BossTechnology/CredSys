import { createClient }        from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect }            from "next/navigation";
import Link                    from "next/link";
import { Badge }               from "@/components/ui/Badge";
import { WorkflowStatusBar }   from "@/components/ui/WorkflowStatusBar";
import { acceptSponsorship, declineSponsorship } from "@/app/actions/sponsorship";
import { getAppDictionary }    from "@/lib/i18n/loader";
import type { AccreditationStatus } from "@/lib/supabase/types";

function fmt(iso: string | null | undefined, locale = "en") {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(locale, {
    month: "long", day: "numeric", year: "numeric",
  });
}

const TERMINAL: AccreditationStatus[] = ["accredited", "rejected", "expired"];

export default async function StartupDashboardPage() {
  const { locale, dict } = await getAppDictionary();
  const t = dict.startupDash;

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

  const { data: startup } = await service
    .from("startups")
    .select("org_name, email, industry, country, website")
    .eq("id", profile.entity_id)
    .single();

  // Most recent accreditation request
  const { data: request } = await service
    .from("accreditation_requests")
    .select("id, status, startup_name, created_at, updated_at, evaluator_notes, rejection_reason, unique_code, accredited_at")
    .eq("startup_id", profile.entity_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const status   = request?.status as AccreditationStatus | undefined;
  const terminal = status ? TERMINAL.includes(status) : false;

  // Pending sponsorship offers — matched by startup_id, or by email for
  // offers made before the sponsor knew the startup_id. Queried separately
  // (rather than a single interpolated .or() filter) so an email containing
  // PostgREST-reserved characters can't break or bypass the filter.
  const sponsorshipCols = "id, sponsor_type, sponsor_investor_id, sponsor_accelerator_id, startup_name_input, notes, created_at, investors(org_name), accelerators(org_name)";

  const [{ data: offersById }, { data: offersByEmail }] = await Promise.all([
    service
      .from("accreditation_sponsorships")
      .select(sponsorshipCols)
      .eq("startup_id", profile.entity_id)
      .eq("status", "pending_startup_acceptance"),
    service
      .from("accreditation_sponsorships")
      .select(sponsorshipCols)
      .eq("startup_email_input", startup?.email ?? "")
      .eq("status", "pending_startup_acceptance"),
  ]);

  const sponsorshipOffers = Array.from(
    new Map([...(offersById ?? []), ...(offersByEmail ?? [])].map((o) => [o.id, o])).values()
  ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Credential page if accredited
  let credCode: string | null = null;
  if (status === "accredited" && request) {
    const { data: credPage } = await service
      .from("cred_pages")
      .select("unique_code")
      .eq("accreditation_request_id", request.id)
      .maybeSingle();
    credCode = credPage?.unique_code ?? null;
  }

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-7 py-8">

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-2 h-2 bg-sb-default" />
          <span className="text-[13px] font-mono text-cs-400 uppercase tracking-widest">
            {t.portal}
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          {startup?.org_name ?? dict.nav.dashboard}
        </h1>
        <p className="text-[13px] font-mono text-cs-400 mt-1">{user.email}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left — accreditation status */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Accreditation card */}
          <div className="border border-cs-200 bg-white">
            <div className="px-5 py-3 border-b border-cs-200 bg-cs-50 flex items-center justify-between">
              <span className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
                {t.accreditationStatus}
              </span>
              {request && <Badge variant={status!}>{dict.status[status!]}</Badge>}
            </div>

            <div className="p-5">
              {!request ? (
                <div className="text-center py-6">
                  <p className="text-[13px] font-mono text-cs-400 mb-4">
                    {t.noRequest}
                  </p>
                  <Link href="/app/startup/accreditation" className="btn-primary btn-sm">
                    {t.applyForAccreditation} →
                  </Link>
                </div>
              ) : (
                <>
                  {/* Workflow progress */}
                  {!terminal && (
                    <div className="mb-5">
                      <WorkflowStatusBar currentStatus={status!} />
                    </div>
                  )}

                  {/* Accredited banner */}
                  {status === "accredited" && credCode && (
                    <div className="bg-sb-light border border-sb-default px-4 py-3 mb-4 flex items-center justify-between">
                      <div>
                        <div className="text-[14px] font-mono text-sb-text uppercase tracking-widest mb-0.5">
                          {t.credentialId}
                        </div>
                        <div className="text-sm font-bold font-mono tracking-widest">
                          {credCode.toUpperCase()}
                        </div>
                        <div className="text-[14px] font-mono text-cs-400 mt-0.5">
                          {t.accredited} {fmt(request.accredited_at, locale)}
                        </div>
                      </div>
                      <Link
                        href={`/startup/${credCode}`}
                        target="_blank"
                        className="btn-accent btn-sm"
                      >
                        {t.viewCredentialBtn} →
                      </Link>
                    </div>
                  )}

                  {/* Rejected state */}
                  {status === "rejected" && (
                    <div className="border border-red-200 bg-red-50 px-4 py-3 mb-4">
                      <div className="text-[14px] font-mono text-red-600 uppercase tracking-widest mb-0.5">
                        {t.notApproved}
                      </div>
                      <p className="text-[13px] text-cs-600 mb-2">
                        {t.notApprovedMsg}
                      </p>
                      {request.rejection_reason && (
                        <p className="text-[13px] text-cs-700 leading-relaxed border-t border-red-200 pt-2">
                          {request.rejection_reason}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Expired state */}
                  {status === "expired" && (
                    <div className="border border-cs-300 bg-cs-50 px-4 py-3 mb-4">
                      <div className="text-[14px] font-mono text-cs-500 uppercase tracking-widest mb-0.5">
                        {t.expiredTitle}
                      </div>
                      <p className="text-[13px] text-cs-600">
                        {t.expiredMsg}
                      </p>
                    </div>
                  )}

                  {/* Evaluator notes */}
                  {request.evaluator_notes && (
                    <div className="border border-cs-200 bg-cs-50 px-4 py-3 mb-4">
                      <div className="text-[14px] font-mono text-cs-400 uppercase tracking-widest mb-1">
                        {t.evaluatorNotes}
                      </div>
                      <p className="text-[13px] text-cs-700 leading-relaxed">
                        {request.evaluator_notes}
                      </p>
                    </div>
                  )}

                  {/* Request meta */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[12px] font-mono">
                    <div>
                      <div className="text-cs-400 uppercase tracking-widest mb-0.5">{t.submitted}</div>
                      <div className="font-semibold">{fmt(request.created_at, locale)}</div>
                    </div>
                    <div>
                      <div className="text-cs-400 uppercase tracking-widest mb-0.5">{t.lastUpdate}</div>
                      <div className="font-semibold">{fmt(request.updated_at, locale)}</div>
                    </div>
                  </div>

                  {/* Link to full detail */}
                  <div className="mt-4">
                    <Link
                      href="/app/startup/accreditation"
                      className="text-[12px] font-mono text-cs-400 uppercase tracking-widest hover:text-black transition-colors"
                    >
                      {t.viewFullDetails} →
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Sponsorship Offers */}
        {(sponsorshipOffers ?? []).length > 0 && (
          <div className="border border-cs-200 bg-white">
            <div className="px-5 py-3 border-b border-cs-200 bg-cs-50">
              <span className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
                {t.sponsorshipOffers} ({sponsorshipOffers!.length})
              </span>
            </div>
            <div className="divide-y divide-cs-100">
              {sponsorshipOffers!.map((offer) => {
                const inv = offer.investors as unknown as { org_name: string } | null;
                const acc = offer.accelerators as unknown as { org_name: string } | null;
                const sponsorName = inv?.org_name ?? acc?.org_name ?? "Unknown Sponsor";
                return (
                  <div key={offer.id} className="p-5 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-[13px] font-semibold">{sponsorName}</div>
                        <div className="text-[14px] font-mono text-cs-400 mt-0.5 uppercase tracking-widest">
                          {offer.sponsor_type} · {t.wantsToSponsor}
                        </div>
                        {offer.notes && (
                          <p className="text-[12px] text-cs-600 mt-1 leading-relaxed">{offer.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <form action={acceptSponsorship}>
                        <input type="hidden" name="sponsorship_id" value={offer.id} />
                        <button type="submit" className="btn-accent btn-sm">
                          {t.accept}
                        </button>
                      </form>
                      <form action={declineSponsorship}>
                        <input type="hidden" name="sponsorship_id" value={offer.id} />
                        <button type="submit" className="btn-danger btn-sm">
                          {t.decline}
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Right — startup info */}
        <div className="flex flex-col gap-4">
          <div className="border border-cs-200 bg-white">
            <div className="px-5 py-3 border-b border-cs-200 bg-cs-50">
              <span className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
                {t.startupInfo}
              </span>
            </div>
            <div className="p-5 flex flex-col gap-3">
              {[
                { label: t.industry, value: startup?.industry },
                { label: t.country,  value: startup?.country  },
                { label: t.website,  value: startup?.website  },
              ].map((f) => (
                <div key={f.label}>
                  <div className="text-[14px] font-mono text-cs-400 uppercase tracking-widest mb-0.5">
                    {f.label}
                  </div>
                  <div className="text-[13px] font-semibold">{f.value || "—"}</div>
                </div>
              ))}
              <Link
                href="/app/startup/profile"
                className="text-[12px] font-mono text-cs-400 uppercase tracking-widest hover:text-black transition-colors mt-2"
              >
                {t.editProfile} →
              </Link>
            </div>
          </div>

          {/* Quick actions */}
          <div className="border border-cs-200 bg-white">
            <div className="px-5 py-3 border-b border-cs-200 bg-cs-50">
              <span className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
                {t.quickLinks}
              </span>
            </div>
            <div className="p-4 flex flex-col gap-2">
              <Link href="/app/startup/accreditation" className="btn-outline btn-sm w-full text-center">
                {dict.nav.accreditation}
              </Link>
              <Link href="/app/startup/competitions" className="btn-outline btn-sm w-full text-center">
                {dict.nav.competitions}
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
