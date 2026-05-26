"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { generateUniqueCode } from "@/lib/utils";
import {
  sendAccredited,
  sendRejected,
  sendEvaluatorAssigned,
  sendNewAssignment,
} from "@/lib/email/resend";
import type { AccreditationStatus } from "@/lib/supabase/types";

export async function advanceAccreditationStatus(formData: FormData) {
  const supabase = createAdminClient();
  const requestId = formData.get("request_id") as string;
  const nextStatus = formData.get("next_status") as AccreditationStatus;

  const { data: request } = await supabase
    .from("accreditation_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (!request) return;

  const updatePayload: Record<string, unknown> = {
    status: nextStatus,
    updated_at: new Date().toISOString(),
  };

  if (nextStatus === "accredited") {
    updatePayload.accredited_at = new Date().toISOString();
    updatePayload.expires_at = new Date(
      Date.now() + 365 * 24 * 60 * 60 * 1000
    ).toISOString();
    updatePayload.unique_code = generateUniqueCode();
  }

  await supabase
    .from("accreditation_requests")
    .update(updatePayload)
    .eq("id", requestId);

  // Send appropriate email
  if (nextStatus === "accredited" && updatePayload.unique_code) {
    await sendAccredited(
      request.startup_email,
      request.startup_org_name,
      updatePayload.unique_code as string
    );
  } else if (nextStatus === "rejected") {
    await sendRejected(request.startup_email, request.startup_org_name);
  }

  revalidatePath("/evaluator/dashboard");
  revalidatePath(`/evaluator/assignments/${requestId}`);
  revalidatePath("/admin/accreditations");
  revalidatePath("/admin/overview");
  revalidatePath("/startup/dashboard");
}

export async function assignEvaluator(formData: FormData) {
  const supabase = createAdminClient();
  const requestId = formData.get("request_id") as string;
  const evaluatorId = formData.get("evaluator_id") as string;

  const [{ data: request }, { data: evaluator }] = await Promise.all([
    supabase
      .from("accreditation_requests")
      .select("*")
      .eq("id", requestId)
      .single(),
    supabase
      .from("profiles")
      .select("org_name,email")
      .eq("user_id", evaluatorId)
      .single(),
  ]);

  if (!request || !evaluator) return;

  await supabase
    .from("accreditation_requests")
    .update({
      evaluator_id: evaluatorId,
      status: "assigned",
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  await Promise.all([
    sendEvaluatorAssigned(
      request.startup_email,
      request.startup_org_name,
      evaluator.org_name
    ),
    sendNewAssignment(
      evaluator.email,
      evaluator.org_name,
      request.startup_org_name,
      requestId
    ),
  ]);

  revalidatePath("/admin/accreditations");
  revalidatePath("/admin/overview");
}
