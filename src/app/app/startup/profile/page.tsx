import { createClient }        from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect }            from "next/navigation";
import { revalidatePath }      from "next/cache";

// ─── Server Action ────────────────────────────────────────────────────────────

async function updateStartupProfile(formData: FormData) {
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
    .from("startups")
    .update({
      org_name:    (formData.get("org_name")    as string) || undefined,
      industry:    (formData.get("industry")    as string) || null,
      stage:       (formData.get("stage")       as string) || null,
      country:     (formData.get("country")     as string) || null,
      website:     (formData.get("website")     as string) || null,
      description: (formData.get("description") as string) || null,
      team_size:   formData.get("team_size") ? Number(formData.get("team_size")) : null,
    })
    .eq("id", profile.entity_id);

  revalidatePath("/app/startup/profile");
  revalidatePath("/app/startup/dashboard");
}

// ─── Options ──────────────────────────────────────────────────────────────────

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

const STAGES = [
  { value: "idea",           label: "Idea / Pre-MVP" },
  { value: "mvp",            label: "MVP"            },
  { value: "early_traction", label: "Early Traction" },
  { value: "growth",         label: "Growth"         },
  { value: "scale",          label: "Scale"          },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function StartupProfilePage() {
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
    .select("*")
    .eq("id", profile.entity_id)
    .single();

  return (
    <div className="max-w-[640px] mx-auto px-7 py-8">

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-2 h-2 bg-sb-default" />
          <span className="text-[8px] font-mono text-cs-400 uppercase tracking-widest">
            Startup Portal
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-[8px] font-mono text-cs-400 mt-1">{user.email}</p>
      </div>

      <form action={updateStartupProfile} className="flex flex-col gap-6">
        <div className="border border-cs-200 bg-white">
          <div className="px-5 py-2 border-b border-cs-200 bg-cs-50">
            <span className="text-[7.5px] font-mono text-cs-400 uppercase tracking-widest">
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
                defaultValue={startup?.org_name ?? ""}
                className="cs-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="cs-label">Industry</label>
                <select name="industry" defaultValue={startup?.industry ?? ""} className="cs-input">
                  <option value="">Select…</option>
                  {INDUSTRIES.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="cs-label">Stage</label>
                <select name="stage" defaultValue={startup?.stage ?? ""} className="cs-input">
                  <option value="">Select…</option>
                  {STAGES.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="cs-label">Website</label>
                <input name="website" type="url" defaultValue={startup?.website ?? ""} placeholder="https://" className="cs-input" />
              </div>
              <div>
                <label className="cs-label">Country</label>
                <input name="country" type="text" defaultValue={startup?.country ?? ""} placeholder="Peru" className="cs-input" />
              </div>
            </div>
            <div>
              <label className="cs-label">Team Size</label>
              <input name="team_size" type="number" min={1} defaultValue={startup?.team_size ?? ""} className="cs-input w-28" />
            </div>
            <div>
              <label className="cs-label">Description</label>
              <textarea
                name="description"
                rows={3}
                defaultValue={startup?.description ?? ""}
                placeholder="What does your startup do?"
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
