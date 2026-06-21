import { createClient }        from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect }            from "next/navigation";
import Link                    from "next/link";
import { Badge }               from "@/components/ui/Badge";
import { WorkflowStatusBar }   from "@/components/ui/WorkflowStatusBar";
import { acceptSponsorship, declineSponsorship } from "@/app/actions/sponsorship";
import type { AccreditationStatus } from "@/lib/supabase/types";

function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en", {
    month: "long", day: "numeric", year: "numeric",
  });
}

const TERMINAL: AccreditationStatus[] = ["accredited", "rejected", "expired"];

export default async function StartupDashboardPage() {
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
    .select("id, status, startup_name, created_at, updated_at, evaluator_notes, unique_code, accredited_at")
    .eq("startup_id", profile.entity_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const status   = request?.status as AccreditationStatus | undefined;
  const terminal = status ? TERMINAL.includes(status) : false;

  // Pending sponsorship offers
  const { data: sponsorshipOffers } = await service
    .from("accreditation_sponsorships")
    .select("id, sponsor_type, sponsor_investor_id, sponsor_accelerator_id, startup_name_input, notes, created_at, investors(org_name), accelerators(org_name)")
    .or(`startup_email_input.eq.${startup?.email ?? ""},startup_id.eq.${profile.entity_id}`)
    .eq("status", "pending_startup_acceptance")
    .order("created_at", { ascending: false });

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
    <div className="max-w-[1280px] mx-auto px-7 py-8">

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-2 h-2 bg-sb-default" />
          <span className="text-[13px] font-mono text-cs-400 uppercase tracking-widest">
            Startup Portal
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          {startup?.org_name ?? "Dashboard"}
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
                Accreditation Status
              </span>
              {request && <Badge variant={status!} />}
            </div>

            <div className="p-5">
              {!request ? (
                <div className="text-center py-6">
                  <p className="text-[13px] font-mono text-cs-400 mb-4">
                    You have not submitted an accreditation request yet.
                  </p>
                  <Link href="/app/startup/accreditation" className="btn-primary btn-sm">
                    Apply for Accreditation →
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
                          Credential ID
                        </div>
                        <div className="text-sm font-bold font-mono tracking-widest">
                          {credCode.toUpperCase()}
                        </div>
                        <div className="text-[14px] font-mono text-cs-400 mt-0.5">
                          Accredited {fmt(request.accredited_at)}
                        </div>
                      </div>
                      <Link
                        href={`/startup/${credCode}`}
                        target="_blank"
                        className="btn-accent btn-sm"
                      >
                        View Credential →
                      </Link>
                    </div>
                  )}

                  {/* Rejected state */}
                  {status === "rejected" && (
                    <div className="border border-red-200 bg-red-50 px-4 py-3 mb-4">
                      <div className="text-[14px] font-mono text-red-600 uppercase tracking-widest mb-0.5">
                        Application Not Approved
                      </div>
                      <p className="text-[13px] text-cs-600">
                        Your application was not approved at this time.
                        Contact support or apply again after addressing the feedback.
                      </p>
                    </div>
                  )}

                  {/* Evaluator notes */}
                  {request.evaluator_notes && (
                    <div className="border border-cs-200 bg-cs-50 px-4 py-3 mb-4">
                      <div className="text-[14px] font-mono text-cs-400 uppercase tracking-widest mb-1">
                        Evaluator Notes
                      </div>
                      <p className="text-[13px] text-cs-700 leading-relaxed">
                        {request.evaluator_notes}
                      </p>
                    </div>
                  )}

                  {/* Request meta */}
                  <div className="grid grid-cols-2 gap-4 text-[12px] font-mono">
                    <div>
                      <div className="text-cs-400 uppercase tracking-widest mb-0.5">Submitted</div>
                      <div className="font-semibold">{fmt(request.created_at)}</div>
                    </div>
                    <div>
                      <div className="text-cs-400 uppercase tracking-widest mb-0.5">Last Updated</div>
                      <div className="font-semibold">{fmt(request.updated_at)}</div>
                    </div>
                  </div>

                  {/* Link to full detail */}
                  <div className="mt-4">
                    <Link
                      href="/app/startup/accreditation"
                      className="text-[12px] font-mono text-cs-400 uppercase tracking-widest hover:text-black transition-colors"
                    >
                      View Full Details →
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
                Sponsorship Offers ({sponsorshipOffers!.length})
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
                          {offer.sponsor_type} · wants to sponsor your accreditation
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
                          Accept
                        </button>
                      </form>
                      <form action={declineSponsorship}>
                        <input type="hidden" name="sponsorship_id" value={offer.id} />
                        <button type="submit" className="btn-danger btn-sm">
                          Decline
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
                Startup Info
              </span>
            </div>
            <div className="p-5 flex flex-col gap-3">
              {[
                { label: "Industry", value: startup?.industry },
                { label: "Country",  value: startup?.country  },
                { label: "Website",  value: startup?.website  },
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
                Edit Profile →
              </Link>
            </div>
          </div>

          {/* Quick actions */}
          <div className="border border-cs-200 bg-white">
            <div className="px-5 py-3 border-b border-cs-200 bg-cs-50">
              <span className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
                Quick Links
              </span>
            </div>
            <div className="p-4 flex flex-col gap-2">
              <Link href="/app/startup/accreditation" className="btn-outline btn-sm w-full text-center">
                Accreditation
              </Link>
              <Link href="/app/startup/competitions" className="btn-outline btn-sm w-full text-center">
                Competitions
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
