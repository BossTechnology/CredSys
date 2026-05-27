"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";

export async function activateEvaluator(formData: FormData) {
  const supabase   = createServiceClient();
  const evaluatorId = formData.get("evaluator_id") as string;
  const deactivate  = formData.get("deactivate") === "true";

  await supabase
    .from("evaluators")
    .update({ is_active: !deactivate })
    .eq("id", evaluatorId);

  revalidatePath("/admin/evaluators");
  revalidatePath("/admin/overview");
}

export async function activateAccelerator(formData: FormData) {
  const supabase      = createServiceClient();
  const acceleratorId = formData.get("accelerator_id") as string;
  const deactivate    = formData.get("deactivate") === "true";

  await supabase
    .from("accelerators")
    .update({ is_active: !deactivate })
    .eq("id", acceleratorId);

  revalidatePath("/admin/accelerators");
  revalidatePath("/admin/overview");
}

export async function assignEvaluatorToRequest(formData: FormData) {
  const supabase    = createServiceClient();
  const requestId   = formData.get("request_id")   as string;
  const evaluatorId = formData.get("evaluator_id") as string;

  if (!requestId || !evaluatorId) return;

  await supabase
    .from("accreditation_requests")
    .update({
      evaluator_id: evaluatorId,
      status:       "evaluator_assigned",
    })
    .eq("id", requestId);

  revalidatePath("/admin/accreditations");
  revalidatePath("/admin/overview");
  revalidatePath("/app/evaluator/dashboard");
}
