"use server";

import { createClient }        from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { revalidatePath }      from "next/cache";
import type { BLIPSVerification, ADDISVerification, BLIPSData, ADDISData } from "@/lib/supabase/types";

// ─── Save BLIPS + ADDIS checkboxes + evaluator notes ─────────────────────────

export async function saveVerification(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const service = createServiceClient();

  const { data: profile } = await service
    .from("user_profiles")
    .select("entity_id, role")
    .eq("user_id", user.id)
    .single();

  if (!profile || profile.role !== "evaluator") return { error: "Unauthorized" };

  const requestId = formData.get("request_id") as string;
  if (!requestId) return { error: "Missing request_id" };

  // Enforce ownership
  const { data: req } = await service
    .from("accreditation_requests")
    .select("id, status")
    .eq("id", requestId)
    .eq("evaluator_id", profile.entity_id)
    .single();

  if (!req) return { error: "Assignment not found" };

  // Parse BLIPS checkboxes from form
  const blips: BLIPSVerification = {
    b: formData.get("blips_b") === "on",
    l: formData.get("blips_l") === "on",
    i: formData.get("blips_i") === "on",
    p: formData.get("blips_p") === "on",
    s: formData.get("blips_s") === "on",
  };

  // Parse ADDIS checkboxes from form
  const addis: ADDISVerification = {
    a:  formData.get("addis_a")  === "on",
    d:  formData.get("addis_d")  === "on",
    d2: formData.get("addis_d2") === "on",
    i:  formData.get("addis_i")  === "on",
    s:  formData.get("addis_s")  === "on",
  };

  const evaluatorNotes = (formData.get("evaluator_notes") as string) || null;

  // Rich chassis-compatible data (new system)
  let blipsData: BLIPSData | undefined;
  let addisData: ADDISData | undefined;
  const blipsDataRaw = formData.get("blips_data") as string | null;
  const addisDataRaw = formData.get("addis_data") as string | null;
  if (blipsDataRaw) {
    try { blipsData = JSON.parse(blipsDataRaw) as BLIPSData; } catch { /* ignore parse errors */ }
  }
  if (addisDataRaw) {
    try { addisData = JSON.parse(addisDataRaw) as ADDISData; } catch { /* ignore parse errors */ }
  }

  const update: Record<string, unknown> = {
    blips_verification: blips,
    addis_verification: addis,
    evaluator_notes:    evaluatorNotes,
  };
  if (blipsData !== undefined) update.blips_data = blipsData;
  if (addisData !== undefined) update.addis_data = addisData;

  await service
    .from("accreditation_requests")
    .update(update)
    .eq("id", requestId);

  revalidatePath(`/app/evaluator/assignments/${requestId}`);
  revalidatePath(`/app/startup/accreditation`);

  return {};
}

// ─── Save rejection reason + reject ──────────────────────────────────────────

export async function rejectWithReason(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const service = createServiceClient();

  const { data: profile } = await service
    .from("user_profiles")
    .select("entity_id, role")
    .eq("user_id", user.id)
    .single();

  if (!profile || profile.role !== "evaluator") return { error: "Unauthorized" };

  const requestId       = formData.get("request_id")       as string;
  const rejectionReason = formData.get("rejection_reason") as string;

  if (!requestId) return { error: "Missing request_id" };

  // Enforce ownership
  const { data: req } = await service
    .from("accreditation_requests")
    .select("startup_email, startup_name")
    .eq("id", requestId)
    .eq("evaluator_id", profile.entity_id)
    .single();

  if (!req) return { error: "Assignment not found" };

  await service
    .from("accreditation_requests")
    .update({ status: "rejected", rejection_reason: rejectionReason || null })
    .eq("id", requestId);

  // Send E5 email
  const { sendRejected } = await import("@/lib/email/templates/e5-rejected");
  sendRejected(req.startup_email, req.startup_name, rejectionReason || undefined)
    .catch((e) => console.error("[rejectWithReason] email error:", e));

  revalidatePath(`/app/evaluator/assignments/${requestId}`);
  revalidatePath("/app/evaluator/dashboard");
  revalidatePath("/app/startup/accreditation");
  revalidatePath("/admin/accreditations");

  return {};
}
