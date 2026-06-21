import { createClient }        from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect }            from "next/navigation";
import { revalidatePath }      from "next/cache";

// ─── Server Action ────────────────────────────────────────────────────────────

async function updateInvestorProfile(formData: FormData) {
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

  await service
    .from("investors")
    .update({
      org_name:         (formData.get("org_name")         as string) || undefined,
      contact_person:   (formData.get("contact_person")   as string) || null,
      phone_whatsapp:   (formData.get("phone_whatsapp")   as string) || null,
      website:          (formData.get("website")          as string) || null,
      investment_focus: (formData.get("investment_focus") as string) || null,
      country:          (formData.get("country")          as string) || null,
      description:      (formData.get("description")      as string) || null,
    })
    .eq("id", profile.entity_id);

  revalidatePath("/app/investor/profile");
  revalidatePath("/app/investor/dashboard");
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function InvestorProfilePage() {
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

  const { data: investor } = await service
    .from("investors")
    .select("*")
    .eq("id", userProfile.entity_id)
    .single();

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
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-[13px] font-mono text-cs-400 mt-1">{user.email}</p>
      </div>

      {/* Status card */}
      <div className="bg-white border border-cs-200 px-5 py-3 flex gap-8 mb-6 text-[12px] font-mono">
        <div>
          <div className="text-cs-400 uppercase tracking-widest mb-0.5">Role</div>
          <div className="font-bold uppercase">Investor</div>
        </div>
        <div>
          <div className="text-cs-400 uppercase tracking-widest mb-0.5">Status</div>
          <div className={investor?.is_active ? "font-bold text-green-600" : "font-bold text-cs-400"}>
            {investor?.is_active ? "Active" : "Pending Activation"}
          </div>
        </div>
        <div>
          <div className="text-cs-400 uppercase tracking-widest mb-0.5">Email</div>
          <div>{investor?.email ?? user.email}</div>
        </div>
      </div>

      {/* Edit form */}
      <form action={updateInvestorProfile} className="flex flex-col gap-6">
        <div className="bg-white border border-cs-200">
          <div className="px-5 py-2 border-b border-cs-200 bg-cs-50">
            <span className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
              Organization Info
            </span>
          </div>
          <div className="p-5 flex flex-col gap-4">
            <div>
              <label className="cs-label">Organization Name *</label>
              <input
                name="org_name"
                type="text"
                required
                defaultValue={investor?.org_name ?? ""}
                className="cs-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="cs-label">Contact Person</label>
                <input
                  name="contact_person"
                  type="text"
                  defaultValue={investor?.contact_person ?? ""}
                  className="cs-input"
                />
              </div>
              <div>
                <label className="cs-label">Phone / WhatsApp</label>
                <input
                  name="phone_whatsapp"
                  type="text"
                  defaultValue={investor?.phone_whatsapp ?? ""}
                  placeholder="+1 555 000 0000"
                  className="cs-input"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="cs-label">Investment Focus</label>
                <input
                  name="investment_focus"
                  type="text"
                  defaultValue={investor?.investment_focus ?? ""}
                  placeholder="e.g. Fintech, SaaS, Seed"
                  className="cs-input"
                />
              </div>
              <div>
                <label className="cs-label">Country</label>
                <input
                  name="country"
                  type="text"
                  defaultValue={investor?.country ?? ""}
                  placeholder="Peru"
                  className="cs-input"
                />
              </div>
            </div>
            <div>
              <label className="cs-label">Website</label>
              <input
                name="website"
                type="url"
                defaultValue={investor?.website ?? ""}
                placeholder="https://"
                className="cs-input"
              />
            </div>
            <div>
              <label className="cs-label">About your Fund / Organization</label>
              <textarea
                name="description"
                rows={3}
                defaultValue={investor?.description ?? ""}
                placeholder="Describe your investment thesis…"
                className="cs-input resize-none"
              />
            </div>
          </div>
        </div>

        <button type="submit" className="btn-primary btn-lg self-start">
          Save Changes
        </button>
      </form>

    </div>
  );
}
