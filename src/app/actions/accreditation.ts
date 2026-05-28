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

  // Always create cred_page immediately on accreditation — independent of email delivery
  if (nextStatus === "accredited" && updatePayload.unique_code) {
    const { error: credPageError } = await supabase.from("cred_pages").insert({
      startup_id:               request.startup_id,
      accreditation_request_id: requestId,
      unique_code:              updatePayload.unique_code,
      is_active:                true,
      accredited_at:            updatePayload.accredited_at,
      expires_at:               updatePayload.expires_at,
    });
    if (credPageError) {
      console.error("[advanceAccreditationStatus] cred_pages insert error", credPageError);
    }
  }

  // Send email and mark sent — failures here never block credential creation
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

  // Notify investors watching this startup
  if (nextStatus === "accredited" && updatePayload.unique_code) {
    try {
      const { data: watchers } = await supabase
        .from("investor_watchlist")
        .select("investors(email, org_name)")
        .eq("startup_id", request.startup_id)
        .eq("notify_on_accredited", true);

      if (watchers?.length) {
        const { sendWatchlistAccredited } = await import("@/lib/email/templates/e14-watchlist-accredited");
        const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL ?? "https://startupboss.org";
        await Promise.allSettled(
          watchers.map((w) => {
            const inv = w.investors as unknown as { email: string };
            return sendWatchlistAccredited(inv.email, request.startup_name, updatePayload.unique_code as string, portalUrl);
          })
        );
      }
    } catch (e) {
      console.error("[accreditation] watchlist notification error", e);
    }
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

  // Notify investors watching this startup (evaluator assigned)
  try {
    const { data: req2 } = await supabase
      .from("accreditation_requests")
      .select("startup_id")
      .eq("id", requestId)
      .single();

    if (req2?.startup_id) {
      const { data: watchers } = await supabase
        .from("investor_watchlist")
        .select("investors(email)")
        .eq("startup_id", req2.startup_id)
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
    console.error("[assignEvaluator] watchlist notification error", e);
  }

  revalidatePath("/admin/accreditations");
  revalidatePath("/admin/overview");
}
