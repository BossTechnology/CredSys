"use server";

import { createClient }        from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";
import { generateUniqueCode } from "@/lib/utils";
import { sendAccredited } from "@/lib/email/templates/e4-accredited";
import { sendRejected } from "@/lib/email/templates/e5-rejected";
import { ACCREDITATION_STATUS_ORDER, type AccreditationStatus } from "@/lib/supabase/types";

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

// Steps a request may be backed out of one at a time. Excludes
// pending_evaluator_assignment/evaluator_assigned (would mean un-assigning)
// and accredited (terminal — already sent emails + issued the cred_page).
const REVERTIBLE_STATUSES: AccreditationStatus[] = ACCREDITATION_STATUS_ORDER.slice(2, -1);

async function applyStatusRevert(
  service: ReturnType<typeof createServiceClient>,
  status: AccreditationStatus,
  requestId: string
): Promise<{ error?: string }> {
  if (!REVERTIBLE_STATUSES.includes(status)) return { error: "This status cannot be reverted" };

  const idx = ACCREDITATION_STATUS_ORDER.indexOf(status);
  const prevStatus = ACCREDITATION_STATUS_ORDER[idx - 1];

  await service
    .from("accreditation_requests")
    .update({ status: prevStatus })
    .eq("id", requestId);

  revalidatePath("/app/evaluator/dashboard");
  revalidatePath(`/app/evaluator/assignments/${requestId}`);
  revalidatePath("/admin/accreditations");
  revalidatePath("/admin/overview");

  return {};
}

// Evaluator-facing: only the assigned evaluator can revert their own request.
export async function revertAccreditationStatus(
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
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

  // Enforce ownership — only the assigned evaluator can revert their own request
  const { data: request } = await service
    .from("accreditation_requests")
    .select("id, status")
    .eq("id", requestId)
    .eq("evaluator_id", profile.entity_id)
    .single();

  if (!request) return { error: "Assignment not found" };

  return applyStatusRevert(service, request.status as AccreditationStatus, requestId);
}

// Admin-facing: any admin can revert any request, no ownership check.
export async function adminRevertAccreditationStatus(
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const { requireAdmin } = await import("@/lib/admin/require-admin");
  const admin = await requireAdmin();
  if (!admin) return { error: "Unauthorized" };

  const service = createServiceClient();
  const requestId = formData.get("request_id") as string;
  if (!requestId) return { error: "Missing request_id" };

  const { data: request } = await service
    .from("accreditation_requests")
    .select("id, status")
    .eq("id", requestId)
    .single();

  if (!request) return { error: "Request not found" };

  return applyStatusRevert(service, request.status as AccreditationStatus, requestId);
}

export async function reactivateRequest(formData: FormData) {
  const supabase  = createServiceClient();
  const requestId = formData.get("request_id") as string;
  if (!requestId) return;

  await supabase
    .from("accreditation_requests")
    .update({
      status:           "pending_evaluator_assignment" as AccreditationStatus,
      evaluator_id:     null,
      rejection_reason: null,
    })
    .eq("id", requestId)
    .eq("status", "rejected");

  revalidatePath("/admin/startups");
  revalidatePath("/admin/accreditations");
  revalidatePath("/admin/overview");
  revalidatePath("/app/startup/dashboard");
}

