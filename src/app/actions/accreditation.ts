"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";
import { generateUniqueCode } from "@/lib/utils";
import { sendAccredited } from "@/lib/email/templates/e4-accredited";
import { sendRejected } from "@/lib/email/templates/e5-rejected";
import { sendEvaluatorAssigned, sendNewAssignment } from "@/lib/email/templates/e3-evaluator-assigned";
import type { AccreditationStatus } from "@/lib/supabase/types";

export async function advanceAccreditationStatus(formData: FormData) {
  const supabase    = createServiceClient();
  const requestId   = formData.get("request_id") as string;
  const nextStatus  = formData.get("next_status") as AccreditationStatus;

  const { data: request } = await supabase
    .from("accreditation_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (!request) return;

  const updatePayload: Record<string, unknown> = { status: nextStatus };

  if (nextStatus === "accredited") {
    updatePayload.accredited_at = new Date().toISOString();
    updatePayload.expires_at    = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    updatePayload.unique_code   = generateUniqueCode();
    updatePayload.e4_sent       = false; // will be set true after email
  }

  await supabase
    .from("accreditation_requests")
    .update(updatePayload)
    .eq("id", requestId);

  // Send email and mark sent
  try {
    if (nextStatus === "accredited" && updatePayload.unique_code) {
      await sendAccredited(
        request.startup_email,
        request.startup_name,
        updatePayload.unique_code as string
      );
      await supabase
        .from("accreditation_requests")
        .update({ e4_sent: true })
        .eq("id", requestId);

      // Create cred_page entry
      await supabase.from("cred_pages").insert({
        startup_id:               request.startup_id,
        accreditation_request_id: requestId,
        unique_code:              updatePayload.unique_code,
        is_active:                true,
        accredited_at:            updatePayload.accredited_at,
        expires_at:               updatePayload.expires_at,
      });
    } else if (nextStatus === "rejected") {
      await sendRejected(request.startup_email, request.startup_name);
      await supabase
        .from("accreditation_requests")
        .update({ e5_sent: true })
        .eq("id", requestId);
    }
  } catch (e) {
    console.error("[advanceAccreditationStatus] email error", e);
  }

  revalidatePath("/app/evaluator/dashboard");
  revalidatePath(`/app/evaluator/assignments/${requestId}`);
  revalidatePath("/admin/accreditations");
  revalidatePath("/admin/overview");
  revalidatePath("/app/startup/dashboard");
}

export async function assignEvaluator(formData: FormData) {
  const supabase    = createServiceClient();
  const requestId   = formData.get("request_id") as string;
  const evaluatorId = formData.get("evaluator_id") as string;

  const [{ data: request }, { data: evaluator }] = await Promise.all([
    supabase
      .from("accreditation_requests")
      .select("startup_name, startup_email")
      .eq("id", requestId)
      .single(),
    supabase
      .from("evaluators")
      .select("org_name, email")
      .eq("id", evaluatorId)
      .single(),
  ]);

  if (!request || !evaluator) return;

  await supabase
    .from("accreditation_requests")
    .update({
      evaluator_id: evaluatorId,
      status:       "evaluator_assigned",
    })
    .eq("id", requestId);

  await Promise.all([
    sendEvaluatorAssigned(request.startup_email, request.startup_name, evaluator.org_name),
    sendNewAssignment(evaluator.email, evaluator.org_name, request.startup_name, requestId),
  ]).catch((e) => console.error("[assignEvaluator] email error", e));

  revalidatePath("/admin/accreditations");
  revalidatePath("/admin/overview");
}
