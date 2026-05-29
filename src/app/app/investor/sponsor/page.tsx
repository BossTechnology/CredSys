import { createClient }        from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect }            from "next/navigation";
import { revalidatePath }      from "next/cache";

// ─── Server Action ────────────────────────────────────────────────────────────

async function createSponsorship(formData: FormData) {
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

  const investorId = profile.entity_id;

  const billing_contact_name    = (formData.get("billing_contact_name")    as string)?.trim();
  const billing_contact_email   = (formData.get("billing_contact_email")   as string)?.trim();
  const billing_contact_phone   = (formData.get("billing_contact_phone")   as string)?.trim() || null;
  const billing_contact_address = (formData.get("billing_contact_address") as string)?.trim() || null;
  const startup_name_input      = (formData.get("startup_name_input")      as string)?.trim();
  const startup_email_input     = (formData.get("startup_email_input")     as string)?.trim();
  const notes                   = (formData.get("notes")                   as string)?.trim() || null;

  if (!billing_contact_name || !billing_contact_email || !startup_name_input || !startup_email_input) return;

  // Check if startup email matches an existing startup
  const { data: existingStartup } = await service
    .from("startups")
    .select("id")
    .eq("email", startup_email_input.toLowerCase())
    .maybeSingle();

  const { data: sponsorship } = await service
    .from("accreditation_sponsorships")
    .insert({
      sponsor_type:             "investor",
      sponsor_investor_id:      investorId,
      billing_contact_name,
      billing_contact_email:    billing_contact_email.toLowerCase(),
      billing_contact_phone,
      billing_contact_address,
      startup_id:               existingStartup?.id ?? null,
      startup_name_input,
      startup_email_input:      startup_email_input.toLowerCase(),
      notes,
      status:                   "pending_startup_acceptance",
    })
    .select("id")
    .single();

  if (!sponsorship) return;

  // Send E11 — fire and forget
  try {
    const { sendSponsorshipOffer } = await import("@/lib/email/templates/e11-sponsorship-offer");
    const { data: investor } = await service
      .from("investors")
      .select("org_name")
      .eq("id", investorId)
      .single();

    const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL ?? "https://startupboss.org";
    await sendSponsorshipOffer(
      startup_email_input.toLowerCase(),
      startup_name_input,
      investor?.org_name ?? "An investor",
      notes,
      portalUrl
    );
  } catch (e) {
    console.error("[createSponsorship] email error", e);
  }

  revalidatePath("/app/investor/sponsor");
  revalidatePath("/app/investor/dashboard");
  redirect("/app/investor/dashboard");
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en", {
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function InvestorSponsorPage() {
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

  const [{ data: investor }, { data: existingSponsorships }] = await Promise.all([
    service.from("investors").select("org_name, contact_person, email").eq("id", investorId).single(),
    service
      .from("accreditation_sponsorships")
      .select("id, startup_name_input, startup_email_input, status, created_at, notes")
      .eq("sponsor_investor_id", investorId)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="max-w-[640px] mx-auto px-7 py-8">

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-2 h-2 bg-sb-default" />
          <span className="text-[13px] font-mono text-cs-400 uppercase tracking-widest">
            Investor Portal
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Sponsor an Accreditation</h1>
        <p className="text-[13px] font-mono text-cs-400 mt-1">
          Fund a startup&apos;s accreditation process on their behalf.
        </p>
      </div>

      {/* Form */}
      <form action={createSponsorship} className="flex flex-col gap-6">

        {/* Section 1: Billing Contact */}
        <div className="bg-white border border-cs-200">
          <div className="px-5 py-2 border-b border-cs-200 bg-cs-50">
            <span className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
              Billing Contact
            </span>
          </div>
          <div className="p-5 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="cs-label">Contact Name *</label>
                <input
                  name="billing_contact_name"
                  type="text"
                  required
                  defaultValue={investor?.contact_person ?? ""}
                  className="cs-input"
                />
              </div>
              <div>
                <label className="cs-label">Contact Email *</label>
                <input
                  name="billing_contact_email"
                  type="email"
                  required
                  defaultValue={investor?.email ?? ""}
                  className="cs-input"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="cs-label">Phone / WhatsApp</label>
                <input
                  name="billing_contact_phone"
                  type="text"
                  className="cs-input"
                />
              </div>
              <div>
                <label className="cs-label">Billing Address</label>
                <input
                  name="billing_contact_address"
                  type="text"
                  className="cs-input"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Startup Info */}
        <div className="bg-white border border-cs-200">
          <div className="px-5 py-2 border-b border-cs-200 bg-cs-50">
            <span className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
              Startup to Sponsor
            </span>
          </div>
          <div className="p-5 flex flex-col gap-4">
            <div>
              <label className="cs-label">Startup Name *</label>
              <input
                name="startup_name_input"
                type="text"
                required
                placeholder="Startup organization name"
                className="cs-input"
              />
            </div>
            <div>
              <label className="cs-label">Startup Email *</label>
              <input
                name="startup_email_input"
                type="email"
                required
                placeholder="startup@example.com"
                className="cs-input"
              />
              <p className="text-[14px] font-mono text-cs-400 mt-1">
                We will send the sponsorship offer to this email address.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Additional Notes */}
        <div className="bg-white border border-cs-200">
          <div className="px-5 py-2 border-b border-cs-200 bg-cs-50">
            <span className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
              Message to Startup (Optional)
            </span>
          </div>
          <div className="p-5">
            <textarea
              name="notes"
              rows={3}
              placeholder="Introduce yourself and explain why you are sponsoring this startup…"
              className="cs-input resize-none w-full"
            />
          </div>
        </div>

        <button type="submit" className="btn-primary btn-lg self-start">
          Send Sponsorship Offer →
        </button>
      </form>

      {/* Existing sponsorships */}
      {(existingSponsorships ?? []).length > 0 && (
        <div className="mt-10 bg-white border border-cs-200">
          <div className="px-5 py-2 border-b border-cs-200 bg-cs-50">
            <span className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
              Your Sponsorships · {existingSponsorships!.length}
            </span>
          </div>
          <div className="divide-y divide-cs-100">
            {existingSponsorships!.map((s) => (
              <div key={s.id} className="px-5 py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="text-[13px] font-semibold">{s.startup_name_input}</div>
                  <div className="text-[14px] font-mono text-cs-400 mt-0.5">{s.startup_email_input}</div>
                  {s.notes && (
                    <div className="text-[14px] font-mono text-cs-400 mt-0.5 italic truncate max-w-xs">
                      {s.notes}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-[14px] font-mono text-cs-400">{fmt(s.created_at)}</span>
                  <span className={`text-[14px] font-mono font-bold uppercase tracking-widest ${STATUS_COLORS[s.status] ?? "text-cs-400"}`}>
                    {s.status.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
