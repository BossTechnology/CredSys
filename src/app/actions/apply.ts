"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sendSubmissionConfirmed } from "@/lib/email/resend";

export async function submitAccreditationRequest(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("org_name")
    .eq("user_id", user.id)
    .single();

  const startupName = (formData.get("startup_name") as string) || profile?.org_name || "Startup";

  const { error } = await admin
    .from("accreditation_requests")
    .insert({
      startup_id: user.id,
      status: "submitted",
      startup_name: startupName,
      startup_email: user.email!,
      startup_org_name: startupName,
      industry: (formData.get("industry") as string) || "other",
      stage: (formData.get("stage") as string) || null,
      description: (formData.get("description") as string) || null,
      problem: (formData.get("problem") as string) || null,
      traction: (formData.get("traction") as string) || null,
      website: (formData.get("website") as string) || null,
      country: (formData.get("country") as string) || null,
      team_size: formData.get("team_size") ? Number(formData.get("team_size")) : null,
      demo_url: (formData.get("demo_url") as string) || null,
      pitch_deck_url: (formData.get("pitch_deck_url") as string) || null,
      additional_notes: (formData.get("additional_notes") as string) || null,
    });

  if (error) {
    console.error("[apply] insert error:", error);
    return;
  }

  // Fire-and-forget email
  try {
    await sendSubmissionConfirmed(user.email!, startupName);
  } catch (e) {
    console.error("[apply] email error:", e);
  }

  revalidatePath("/startup/dashboard");
  revalidatePath("/admin/accreditations");
  revalidatePath("/admin/overview");
  redirect("/startup/dashboard");
}
