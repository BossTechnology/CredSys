"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sendSubmissionConfirmed } from "@/lib/email/templates/e2-submission-confirmed";
import { matchAndAssign } from "@/lib/accreditation/matching";

export async function submitAccreditationRequest(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/en/login");

  const service = createServiceClient();

  // Get startup entity via user_profiles
  const { data: userProfile } = await service
    .from("user_profiles")
    .select("entity_id, role")
    .eq("user_id", user.id)
    .single();

  if (!userProfile || userProfile.role !== "startup") redirect("/en/login");

  const { data: startup } = await service
    .from("startups")
    .select("org_name, email")
    .eq("id", userProfile.entity_id)
    .single();

  const startupName  = (formData.get("startup_name") as string) || startup?.org_name || "Startup";
  const startupEmail = startup?.email ?? user.email!;

  const { data: inserted, error } = await service
    .from("accreditation_requests")
    .insert({
      startup_id:       userProfile.entity_id,
      status:           "pending_evaluator_assignment",
      startup_name:     startupName,
      startup_email:    startupEmail,
      industry:         (formData.get("industry") as string) || "other",
      stage:            (formData.get("stage") as string) || null,
      description:      (formData.get("description") as string) || null,
      problem:          (formData.get("problem") as string) || null,
      traction:         (formData.get("traction") as string) || null,
      website:          (formData.get("website") as string) || null,
      country:          (formData.get("country") as string) || null,
      team_size:        formData.get("team_size") ? Number(formData.get("team_size")) : null,
      demo_url:         (formData.get("demo_url") as string) || null,
      pitch_deck_url:   (formData.get("pitch_deck_url") as string) || null,
      additional_notes: (formData.get("additional_notes") as string) || null,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    console.error("[apply] insert error:", error);
    return;
  }

  // Send confirmation email
  sendSubmissionConfirmed(startupEmail, startupName).catch(
    (e) => console.error("[apply] email error:", e)
  );

  // Auto-assign evaluator
  matchAndAssign(inserted.id).catch(
    (e) => console.error("[apply] matchAndAssign error:", e)
  );

  revalidatePath("/app/startup/dashboard");
  revalidatePath("/admin/accreditations");
  revalidatePath("/admin/overview");
  redirect("/app/startup/dashboard");
}
