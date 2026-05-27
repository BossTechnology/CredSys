import { createServiceClient } from "@/lib/supabase/service";
import { sendEvaluatorAssigned } from "@/lib/email/templates/e3-evaluator-assigned";
import { sendNewAssignment } from "@/lib/email/templates/e3-evaluator-assigned";

interface MatchResult {
  evaluatorId: string | null;
  reason: string;
}

/**
 * matchAndAssign — Auto-assigns an active evaluator to an accreditation request.
 *
 * Selection logic:
 *  1. Filter active evaluators only (evaluators.is_active = true)
 *  2. Prefer industry match (evaluator.industry === request.industry)
 *  3. If competitionId provided, prefer evaluators assigned to that competition
 *  4. Load-balance: pick evaluator with fewest active assignments
 *  5. Fallback: any active evaluator regardless of industry
 *
 * Side effects:
 *  - Updates accreditation_requests.evaluator_id and status
 *  - Sends E3 email to startup (evaluator assigned)
 *  - Sends E3b email to evaluator (new assignment)
 */
export async function matchAndAssign(
  requestId: string,
  options?: { competitionId?: string }
): Promise<MatchResult> {
  const db = createServiceClient();

  // Load the request
  const { data: request, error: reqErr } = await db
    .from("accreditation_requests")
    .select("id, startup_id, startup_name, startup_email, industry, status")
    .eq("id", requestId)
    .single();

  if (reqErr || !request) {
    return { evaluatorId: null, reason: "Request not found" };
  }

  if (request.status !== "pending_evaluator_assignment") {
    return { evaluatorId: null, reason: "Request already has an evaluator" };
  }

  // Get all active evaluators with current assignment counts
  const { data: evaluators } = await db
    .from("evaluators")
    .select("id, org_name, email, industry")
    .eq("is_active", true);

  if (!evaluators || evaluators.length === 0) {
    return { evaluatorId: null, reason: "No active evaluators available" };
  }

  // Count active assignments per evaluator
  const { data: assignmentCounts } = await db
    .from("accreditation_requests")
    .select("evaluator_id")
    .in("status", [
      "evaluator_assigned",
      "meeting_scheduled",
      "chass1s_shared",
      "implementation_in_progress",
      "ready_for_verification",
      "verification_in_progress",
    ])
    .not("evaluator_id", "is", null);

  const countMap: Record<string, number> = {};
  for (const ev of evaluators) countMap[ev.id] = 0;
  for (const row of assignmentCounts ?? []) {
    if (row.evaluator_id && countMap[row.evaluator_id] !== undefined) {
      countMap[row.evaluator_id]++;
    }
  }

  // If competitionId, get evaluators assigned to that competition (preferred pool)
  let preferredIds: Set<string> = new Set();
  if (options?.competitionId) {
    const { data: compEvals } = await db
      .from("competition_evaluators")
      .select("evaluator_id")
      .eq("competition_id", options.competitionId);
    preferredIds = new Set((compEvals ?? []).map((r) => r.evaluator_id));
  }

  // Sort candidates: preferred + industry match first, then by load
  const sorted = [...evaluators].sort((a, b) => {
    const aPreferred  = preferredIds.has(a.id) ? 0 : 1;
    const bPreferred  = preferredIds.has(b.id) ? 0 : 1;
    const aIndustry   = a.industry === request.industry ? 0 : 1;
    const bIndustry   = b.industry === request.industry ? 0 : 1;
    const aLoad       = countMap[a.id] ?? 0;
    const bLoad       = countMap[b.id] ?? 0;

    // Priority: competition pool > industry match > load
    if (aPreferred !== bPreferred) return aPreferred - bPreferred;
    if (aIndustry  !== bIndustry)  return aIndustry  - bIndustry;
    return aLoad - bLoad;
  });

  const chosen = sorted[0];

  // Assign evaluator
  const { error: updateErr } = await db
    .from("accreditation_requests")
    .update({
      evaluator_id: chosen.id,
      status:       "evaluator_assigned",
    })
    .eq("id", requestId);

  if (updateErr) {
    console.error("[matchAndAssign] update error", updateErr);
    return { evaluatorId: null, reason: "DB update failed" };
  }

  // Send emails (fire-and-forget; don't block on errors)
  Promise.all([
    sendEvaluatorAssigned(
      request.startup_email,
      request.startup_name,
      chosen.org_name
    ).catch((e) => console.error("[matchAndAssign] E3 startup email error", e)),

    sendNewAssignment(
      chosen.email,
      chosen.org_name,
      request.startup_name,
      requestId
    ).catch((e) => console.error("[matchAndAssign] E3b evaluator email error", e)),
  ]);

  return {
    evaluatorId: chosen.id,
    reason: `Assigned ${chosen.org_name} (load: ${countMap[chosen.id]})`,
  };
}
