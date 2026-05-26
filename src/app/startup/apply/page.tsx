"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { createClient } from "@/lib/supabase/client";

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

const STAGE_OPTIONS = [
  { value: "idea", label: "Idea / Pre-MVP" },
  { value: "mvp", label: "MVP" },
  { value: "early_traction", label: "Early Traction" },
  { value: "growth", label: "Growth" },
  { value: "scale", label: "Scale" },
];

export default function ApplyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not authenticated."); setLoading(false); return; }

    const fd = new FormData(e.currentTarget);

    const { error: insertError } = await supabase
      .from("accreditation_requests")
      .insert({
        startup_id: user.id,
        status: "submitted",
        startup_name: fd.get("startup_name") as string,
        startup_email: user.email,
        startup_org_name: fd.get("startup_name") as string,
        industry: fd.get("industry") as string,
        stage: fd.get("stage") as string,
        description: fd.get("description") as string,
        website: fd.get("website") as string,
        country: fd.get("country") as string,
        team_size: fd.get("team_size") ? Number(fd.get("team_size")) : null,
      });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    router.push("/startup/dashboard");
  }

  return (
    <div className="max-w-[600px] mx-auto px-7 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Apply for Accreditation</h1>
        <p className="text-[8px] font-mono text-cs-400 uppercase tracking-widest mt-1">
          StartupCred Application Form
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Section 1: Basic info */}
        <SectionDivider label="01 — Startup Information" />
        <div className="border border-cs-200 bg-white p-4 flex flex-col gap-3">
          <Input name="startup_name" label="Startup Name" placeholder="Acme Startup Inc." required />
          <div className="grid grid-cols-2 gap-3">
            <Select
              name="industry"
              label="Industry"
              options={INDUSTRY_OPTIONS}
              placeholder="Select industry..."
              required
            />
            <Select
              name="stage"
              label="Stage"
              options={STAGE_OPTIONS}
              placeholder="Select stage..."
              required
            />
          </div>
          <Input name="website" type="url" label="Website" placeholder="https://yourstartup.com" />
          <Input name="country" label="Country" placeholder="Peru" />
          <Input name="team_size" type="number" label="Team Size" placeholder="5" min={1} />
        </div>

        {/* Section 2: Description */}
        <SectionDivider label="02 — About Your Startup" />
        <div className="border border-cs-200 bg-white p-4 flex flex-col gap-3">
          <Textarea
            name="description"
            label="What does your startup do?"
            placeholder="Describe your product, market, and traction..."
            required
            className="min-h-[80px]"
            variant="cream"
          />
          <Textarea
            name="problem"
            label="What problem are you solving?"
            placeholder="Describe the problem and your solution..."
            className="min-h-[60px]"
            variant="cream"
          />
          <Textarea
            name="traction"
            label="Current Traction / Metrics"
            placeholder="Revenue, users, growth rate..."
            className="min-h-[60px]"
            variant="cream"
          />
        </div>

        {/* Section 3: Evidence */}
        <SectionDivider label="03 — Supporting Evidence" />
        <div className="border border-cs-200 bg-white p-4 flex flex-col gap-3">
          <Input
            name="demo_url"
            type="url"
            label="Demo / Product Link"
            placeholder="https://demo.yourstartup.com"
          />
          <Input
            name="pitch_deck_url"
            type="url"
            label="Pitch Deck URL"
            placeholder="https://drive.google.com/..."
          />
          <Textarea
            name="additional_notes"
            label="Additional Notes"
            placeholder="Any other information relevant to your application..."
            className="min-h-[50px]"
            variant="cream"
          />
        </div>

        {error && (
          <div className="bg-cs-red-100 border border-cs-red px-3 py-2 text-[8px] font-mono text-cs-red">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Button type="submit" loading={loading} size="lg">
            Submit Accreditation Request
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
