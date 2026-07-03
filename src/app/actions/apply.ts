"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sendSubmissionConfirmed } from "@/lib/email/templates/e2-submission-confirmed";

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

  // Guard against duplicate submissions (e.g. double-clicking Submit) — a
  // startup only ever has one accreditation_request, reused across statuses.
  const { data: existing } = await service
    .from("accreditation_requests")
    .select("id")
    .eq("startup_id", userProfile.entity_id)
    .maybeSingle();

  if (existing) {
    redirect("/app/startup/dashboard");
  }

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

  revalidatePath("/app/startup/dashboard");
  revalidatePath("/admin/accreditations");
  revalidatePath("/admin/overview");
  redirect("/app/startup/dashboard");
}

// ─── Re-apply after rejection/expiration ──────────────────────────────────────

/**
 * Let a startup re-enter the queue after a rejected or expired request,
 * reusing the same row (accreditation_requests.startup_id is unique — a
 * startup never gets a second row, its one request is reused across statuses).
 */
export async function reapplyAccreditation(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const service = createServiceClient();

  const { data: profile } = await service
    .from("user_profiles")
    .select("entity_id, role")
    .eq("user_id", user.id)
    .single();

  if (!profile || profile.role !== "startup") return { error: "Unauthorized" };

  const requestId = formData.get("request_id") as string;
  if (!requestId) return { error: "Missing request_id" };

  const { data: request } = await service
    .from("accreditation_requests")
    .select("id, status")
    .eq("id", requestId)
    .eq("startup_id", profile.entity_id)
    .single();

  if (!request) return { error: "Request not found" };
  if (request.status !== "rejected" && request.status !== "expired") {
    return { error: "This request cannot be re-applied" };
  }

  await service
    .from("accreditation_requests")
    .update({
      status:                   "pending_evaluator_assignment",
      evaluator_id:             null,
      acceptance_status:        "pending",
      rejection_reason:         null,
      evaluator_decline_reason: null,
    })
    .eq("id", requestId);

  revalidatePath("/app/startup/dashboard");
  revalidatePath("/app/startup/accreditation");
  revalidatePath("/admin/accreditations");
  revalidatePath("/admin/overview");

  return {};
}
