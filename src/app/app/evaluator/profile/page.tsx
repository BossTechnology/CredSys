import { createClient }        from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect }            from "next/navigation";
import { revalidatePath }      from "next/cache";

// ─── Server Action ────────────────────────────────────────────────────────────

async function updateEvaluatorProfile(formData: FormData) {
  "use server";

  const { createClient: makeClient } = await import("@/lib/supabase/server");
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
    .from("evaluators")
    .update({
      org_name:    formData.get("org_name")    as string,
      industry:    (formData.get("industry")   as string) || null,
      country:     (formData.get("country")    as string) || null,
      website:     (formData.get("website")    as string) || null,
      description: (formData.get("description") as string) || null,
    })
    .eq("id", profile.entity_id);

  revalidatePath("/app/evaluator/profile");
}

// ─── Industry options ─────────────────────────────────────────────────────────

const INDUSTRIES = [
  { value: "fintech",    label: "Fintech"     },
  { value: "edtech",     label: "Edtech"      },
  { value: "healthtech", label: "Healthtech"  },
  { value: "agritech",   label: "Agritech"    },
  { value: "ecommerce",  label: "E-Commerce"  },
  { value: "saas",       label: "SaaS / B2B"  },
  { value: "cleantech",  label: "Cleantech"   },
  { value: "logistics",  label: "Logistics"   },
  { value: "other",      label: "Other"       },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function EvaluatorProfilePage() {
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

  const [{ data: evaluator }, { count: assignmentCount }, { count: scoredCount }] =
    await Promise.all([
      service
        .from("evaluators")
        .select("*")
        .eq("id", userProfile.entity_id)
        .single(),
      service
        .from("accreditation_requests")
        .select("*", { count: "exact", head: true })
        .eq("evaluator_id", userProfile.entity_id),
      service
        .from("competition_scores")
        .select("*", { count: "exact", head: true })
        .eq("evaluator_id", userProfile.entity_id),
    ]);

  return (
    <div className="max-w-[640px] mx-auto px-7 py-8">

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-2 h-2 bg-sb-default" />
          <span className="text-[13px] font-mono text-cs-400 uppercase tracking-widest">
            Evaluator Portal
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-[13px] font-mono text-cs-400 mt-1">{user.email}</p>
      </div>

      {/* Stats strip */}
      <div className="border border-cs-200 bg-white flex divide-x divide-cs-200 mb-8">
        {[
          { label: "Status",          value: evaluator?.is_active ? "Active" : "Pending", accent: evaluator?.is_active },
          { label: "Assignments",     value: String(assignmentCount ?? 0) },
          { label: "Entries Scored",  value: String(scoredCount ?? 0) },
          { label: "Member Since",    value: evaluator?.created_at
              ? new Date(evaluator.created_at).toLocaleDateString("en", { month: "short", year: "numeric" })
              : "—" },
        ].map((s) => (
          <div key={s.label} className="flex-1 px-5 py-3">
            <div className="text-[14px] font-mono text-cs-400 uppercase tracking-widest mb-0.5">
              {s.label}
            </div>
            <div className={`text-[13px] font-semibold ${s.accent ? "text-sb-text" : ""}`}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Edit form */}
      <form action={updateEvaluatorProfile} className="flex flex-col gap-6">
        <div className="border border-cs-200 bg-white">
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
                defaultValue={evaluator?.org_name ?? ""}
                placeholder="Acme Evaluators LLC"
                className="cs-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="cs-label">Specialization</label>
                <select name="industry" defaultValue={evaluator?.industry ?? ""} className="cs-input">
                  <option value="">Select industry…</option>
                  {INDUSTRIES.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="cs-label">Country</label>
                <input
                  name="country"
                  type="text"
                  defaultValue={evaluator?.country ?? ""}
                  placeholder="Peru"
                  className="cs-input"
                />
              </div>
            </div>
            <div>
              <label className="cs-label">Website</label>
              <input
                name="website"
                type="text"
                defaultValue={evaluator?.website ?? ""}
                placeholder="yourstartup.com"
                className="cs-input"
              />
            </div>
            <div>
              <label className="cs-label">Bio / Expertise</label>
              <textarea
                name="description"
                rows={3}
                defaultValue={evaluator?.description ?? ""}
                placeholder="Describe your evaluation expertise…"
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
