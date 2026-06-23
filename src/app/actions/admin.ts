"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { revalidatePath }      from "next/cache";
import { sendAccountSetup }    from "@/lib/email/templates/e1-account-setup";
import { sendEvaluatorAssigned, sendNewAssignment } from "@/lib/email/templates/e3-evaluator-assigned";

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

  const [{ data: request }, { data: evaluator }] = await Promise.all([
    supabase
      .from("accreditation_requests")
      .select("startup_id, startup_name, startup_email")
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
      evaluator_id:             evaluatorId,
      status:                   "evaluator_assigned",
      acceptance_status:        "pending",
      evaluator_decline_reason: null,
    })
    .eq("id", requestId);

  // Notify evaluator (E3b) + startup (E3)
  await Promise.all([
    sendNewAssignment(evaluator.email, evaluator.org_name, request.startup_name, requestId),
    sendEvaluatorAssigned(request.startup_email, request.startup_name, evaluator.org_name),
  ]).catch((e) => console.error("[assignEvaluatorToRequest] email error", e));

  // Notify investor watchlist subscribers
  try {
    if (request.startup_id) {
      const { data: watchers } = await supabase
        .from("investor_watchlist")
        .select("investors(email)")
        .eq("startup_id", request.startup_id)
        .eq("notify_on_evaluator_assigned", true);

      if (watchers?.length) {
        const { sendWatchlistEvaluatorAssigned } = await import("@/lib/email/templates/e15-watchlist-evaluator-assigned");
        await Promise.allSettled(
          watchers.map((w) => {
            const inv = w.investors as unknown as { email: string };
            return sendWatchlistEvaluatorAssigned(inv.email, request.startup_name);
          })
        );
      }
    }
  } catch (e) {
    console.error("[assignEvaluatorToRequest] watchlist notification error", e);
  }

  revalidatePath("/admin/accreditations");
  revalidatePath("/admin/overview");
  revalidatePath("/app/evaluator/dashboard");
}

export async function resendSetupLink(formData: FormData) {
  const entityId = formData.get("entity_id") as string;
  const email    = formData.get("email")     as string;
  const orgName  = formData.get("org_name")  as string;
  const role     = formData.get("role")      as string;

  if (!entityId || !email || !orgName || !role) return;

  const service = createServiceClient();

  // Create a fresh setup token (old ones stay but won't conflict)
  const { data: tokenRow, error: tokenError } = await service
    .from("account_setup_tokens")
    .insert({ email: email.toLowerCase(), role, entity_id: entityId })
    .select("token")
    .single();

  if (tokenError || !tokenRow) {
    console.error("[resendSetupLink] token error:", tokenError);
    return;
  }

  const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL ?? "https://startupboss.org";
  const setupUrl  = `${portalUrl}/en/setup?token=${tokenRow.token}`;

  try {
    await sendAccountSetup(email, orgName, setupUrl);
  } catch (e) {
    console.error("[resendSetupLink] email error:", e);
  }

  revalidatePath("/admin/startups");
}
