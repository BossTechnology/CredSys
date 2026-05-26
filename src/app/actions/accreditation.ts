"use server";

import { createClient } from "@/lib/supabase/server";
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
  const supabase = await createClient();
  const requestId = formData.get("request_id") as string;
  const nextStatus = formData.get("next_status") as AccreditationStatus;

  const { data: request } = await supabase
    .from("accreditation_requests")
    .select("*, startup:startup_id(org_name,email), evaluator:evaluator_id(org_name,email)")
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
  const startup = request.startup as { org_name: string; email: string };
  if (nextStatus === "accredited" && updatePayload.unique_code) {
    await sendAccredited(startup.email, startup.org_name, updatePayload.unique_code as string);
  } else if (nextStatus === "rejected") {
    await sendRejected(startup.email, startup.org_name);
  }

  revalidatePath("/evaluator/assignments");
  revalidatePath(`/evaluator/assignments/${requestId}`);
  revalidatePath("/admin/accreditations");
}

export async function assignEvaluator(formData: FormData) {
  const supabase = await createClient();
  const requestId = formData.get("request_id") as string;
  const evaluatorId = formData.get("evaluator_id") as string;

  const [{ data: request }, { data: evaluator }] = await Promise.all([
    supabase
      .from("accreditation_requests")
      .select("*, startup:startup_id(org_name,email)")
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
    .update({ evaluator_id: evaluatorId, status: "assigned", updated_at: new Date().toISOString() })
    .eq("id", requestId);

  const startup = request.startup as { org_name: string; email: string };
  await Promise.all([
    sendEvaluatorAssigned(startup.email, startup.org_name, evaluator.org_name),
    sendNewAssignment(evaluator.email, evaluator.org_name, startup.org_name, requestId),
  ]);

  revalidatePath("/admin/accreditations");
}
