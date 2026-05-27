import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { updateProfile } from "@/app/actions/profile";
import { formatDate } from "@/lib/utils";

const INDUSTRY_OPTIONS = [
  { value: "fintech", label: "Fintech" },
  { value: "edtech", label: "Edtech" },
  { value: "healthtech", label: "Healthtech" },
  { value: "agritech", label: "Agritech" },
  { value: "ecommerce", label: "E-Commerce" },
  { value: "saas", label: "SaaS / B2B" },
  { value: "cleantech", label: "Cleantech" },
  { value: "logistics", label: "Logistics" },
  { value: "other", label: "Other" },
];

export default async function AcceleratorProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createServiceClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return (
    <div className="max-w-[600px] mx-auto px-7 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Accelerator Profile</h1>
        <p className="text-[8px] font-mono text-cs-400 uppercase tracking-widest mt-1">
          {user.email}
        </p>
      </div>

      <div className="border border-cs-200 bg-white px-4 py-3 flex gap-8 mb-5 text-[7.5px] font-mono">
        <div>
          <div className="text-cs-400 uppercase tracking-widest mb-0.5">Role</div>
          <div className="font-semibold uppercase">Accelerator</div>
        </div>
        <div>
          <div className="text-cs-400 uppercase tracking-widest mb-0.5">Status</div>
          <div className={profile?.is_active ? "font-semibold text-sb-text" : "font-semibold text-cs-red"}>
            {profile?.is_active ? "Active" : "Pending Activation"}
          </div>
        </div>
        <div>
          <div className="text-cs-400 uppercase tracking-widest mb-0.5">Member Since</div>
          <div>{profile?.created_at ? formatDate(profile.created_at) : "—"}</div>
        </div>
      </div>

      <form action={updateProfile} className="flex flex-col gap-5">
        <SectionDivider label="Organization Info" />
        <div className="border border-cs-200 bg-white p-4 flex flex-col gap-3">
          <Input
            name="org_name"
            label="Accelerator Name"
            placeholder="Acme Accelerator Program"
            defaultValue={profile?.org_name ?? ""}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              name="industry"
              label="Focus Industry"
              options={INDUSTRY_OPTIONS}
              placeholder="Select industry..."
              defaultValue={profile?.industry ?? ""}
            />
            <Input
              name="country"
              label="Country"
              placeholder="Peru"
              defaultValue={profile?.country ?? ""}
            />
          </div>
          <Input
            name="website"
            type="url"
            label="Website"
            placeholder="https://youracceleration.com"
            defaultValue={profile?.website ?? ""}
          />
          <Textarea
            name="description"
            label="About your Program"
            placeholder="Describe your accelerator program..."
            className="min-h-[80px]"
            variant="cream"
            defaultValue={profile?.description ?? ""}
          />
        </div>

        <Button type="submit" size="lg">Save Changes</Button>
      </form>
    </div>
  );
}
