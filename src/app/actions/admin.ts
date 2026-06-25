"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { revalidatePath }      from "next/cache";
import { sendAccountSetup }    from "@/lib/email/templates/e1-account-setup";
import { sendEvaluatorAssigned, sendNewAssignment } from "@/lib/email/templates/e3-evaluator-assigned";
import { requireAdmin } from "@/lib/admin/require-admin";

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

// ─── Entity deletion ─────────────────────────────────────────────────────────

type EntityTable = "startups" | "accelerators" | "evaluators" | "investors" | "competitions";

/**
 * Hard-delete an entity and everything the DB foreign keys don't clean up.
 * DB cascades handle accreditation_requests/cred_pages/competition_* etc.;
 * here we remove the login account, setup tokens, and (for evaluators) the
 * competition_scores rows blocked by a NO ACTION FK.
 */
async function deleteEntityCascade(table: EntityTable, entityId: string): Promise<void> {
  const service = createServiceClient();

  // Evaluators: competition_scores.evaluator_id is NO ACTION → must clear first.
  if (table === "evaluators") {
    await service.from("competition_scores").delete().eq("evaluator_id", entityId);
  }

  // Competitions have no login/token/profile; everything else does.
  if (table !== "competitions") {
    await service.from("account_setup_tokens").delete().eq("entity_id", entityId);

    const { data: profiles } = await service
      .from("user_profiles")
      .select("user_id")
      .eq("entity_id", entityId);

    await service.from("user_profiles").delete().eq("entity_id", entityId);

    for (const p of profiles ?? []) {
      if (p.user_id) {
        const { error } = await service.auth.admin.deleteUser(p.user_id);
        if (error) console.error("[deleteEntityCascade] auth delete error", error);
      }
    }
  }

  const { error } = await service.from(table).delete().eq("id", entityId);
  if (error) console.error(`[deleteEntityCascade] ${table} delete error`, error);
}

export async function deleteStartup(formData: FormData) {
  if (!(await requireAdmin())) return;
  const id = formData.get("entity_id") as string;
  if (!id) return;
  await deleteEntityCascade("startups", id);
  revalidatePath("/admin/startups");
  revalidatePath("/admin/overview");
  revalidatePath("/admin/accreditations");
}

export async function deleteAccelerator(formData: FormData) {
  if (!(await requireAdmin())) return;
  const id = formData.get("entity_id") as string;
  if (!id) return;
  await deleteEntityCascade("accelerators", id);
  revalidatePath("/admin/accelerators");
  revalidatePath("/admin/overview");
}

export async function deleteEvaluator(formData: FormData) {
  if (!(await requireAdmin())) return;
  const id = formData.get("entity_id") as string;
  if (!id) return;
  await deleteEntityCascade("evaluators", id);
  revalidatePath("/admin/evaluators");
  revalidatePath("/admin/overview");
}

export async function deleteInvestor(formData: FormData) {
  if (!(await requireAdmin())) return;
  const id = formData.get("entity_id") as string;
  if (!id) return;
  await deleteEntityCascade("investors", id);
  revalidatePath("/admin/investors");
  revalidatePath("/admin/overview");
}

export async function deleteCompetition(formData: FormData) {
  if (!(await requireAdmin())) return;
  const id = formData.get("entity_id") as string;
  if (!id) return;
  await deleteEntityCascade("competitions", id);
  revalidatePath("/admin/competitions");
  revalidatePath("/admin/overview");
}

// ─── Edit entity email (synced to login + pending token) ─────────────────────

type EmailState = { error?: string; ok?: boolean };

export async function updateEntityEmail(
  _prev: EmailState,
  formData: FormData
): Promise<EmailState> {
  if (!(await requireAdmin())) return { error: "Unauthorized" };

  const table    = formData.get("table") as "startups" | "investors";
  const entityId = formData.get("entity_id") as string;
  const newEmail = ((formData.get("new_email") as string) || "").trim().toLowerCase();

  if (!table || !entityId || !newEmail) return { error: "Missing fields" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) return { error: "Invalid email" };

  const service = createServiceClient();

  // Uniqueness within the same entity table
  const { data: dupe } = await service
    .from(table)
    .select("id")
    .eq("email", newEmail)
    .neq("id", entityId)
    .maybeSingle();
  if (dupe) return { error: "Email already in use" };

  await service.from(table).update({ email: newEmail }).eq("id", entityId);

  // Sync the login account if one exists
  const { data: profile } = await service
    .from("user_profiles")
    .select("user_id")
    .eq("entity_id", entityId)
    .maybeSingle();
  if (profile?.user_id) {
    const { error } = await service.auth.admin.updateUserById(profile.user_id, {
      email: newEmail,
      email_confirm: true,
    });
    if (error) console.error("[updateEntityEmail] auth update error", error);
  }

  // Sync any unused setup token
  await service
    .from("account_setup_tokens")
    .update({ email: newEmail })
    .eq("entity_id", entityId)
    .is("used_at", null);

  revalidatePath(`/admin/${table}`);
  return { ok: true };
}

export async function activateInvestor(formData: FormData) {
  if (!(await requireAdmin())) return;
  const supabase   = createServiceClient();
  const investorId = formData.get("investor_id") as string;
  const deactivate = formData.get("deactivate") === "true";

  await supabase.from("investors").update({ is_active: !deactivate }).eq("id", investorId);

  revalidatePath("/admin/investors");
  revalidatePath("/admin/overview");
}

// ─── Test Mode ───────────────────────────────────────────────────────────────

export async function setTestMode(formData: FormData) {
  if (!(await requireAdmin())) return;
  const on = formData.get("test_mode") === "on";
  const service = createServiceClient();
  await service
    .from("app_settings")
    .update({ test_mode: on, updated_at: new Date().toISOString() })
    .eq("id", 1);
  revalidatePath("/admin", "layout");
  revalidatePath("/admin/overview");
}

/**
 * Hard-delete every entity flagged is_test across all five tables,
 * reusing deleteEntityCascade. Guarded by a typed "PURGE" confirmation.
 */
export async function purgeTestData(formData: FormData) {
  if (!(await requireAdmin())) return;
  const confirm = ((formData.get("confirm") as string) || "").trim().toUpperCase();
  if (confirm !== "PURGE") return;

  const service = createServiceClient();
  const tables: EntityTable[] = ["startups", "accelerators", "evaluators", "investors", "competitions"];

  for (const table of tables) {
    const { data: rows } = await service.from(table).select("id").eq("is_test", true);
    for (const r of rows ?? []) {
      await deleteEntityCascade(table, r.id as string);
    }
  }

  revalidatePath("/admin/overview");
  revalidatePath("/admin/startups");
  revalidatePath("/admin/accelerators");
  revalidatePath("/admin/evaluators");
  revalidatePath("/admin/investors");
  revalidatePath("/admin/competitions");
}
