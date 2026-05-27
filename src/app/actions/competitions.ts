"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sendCompetitionEntered } from "@/lib/email/templates/e7-competition-entry";
import { sendEntryScored }        from "@/lib/email/templates/e8-entry-scored";
import { sendCompetitionResults } from "@/lib/email/templates/e9-competition-results";

// -------------------------------------------------------
// Startup enters a competition (must be accredited)
// -------------------------------------------------------
export async function enterCompetition(formData: FormData) {
  const competitionId = formData.get("competition_id") as string;
  if (!competitionId) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/en/login");

  const service = createServiceClient();

  // Resolve startup entity
  const { data: userProfile } = await service
    .from("user_profiles")
    .select("entity_id, role")
    .eq("user_id", user.id)
    .single();

  if (!userProfile || userProfile.role !== "startup") return;
  const startupId = userProfile.entity_id;

  // Must be accredited
  const { data: accredited } = await service
    .from("accreditation_requests")
    .select("id")
    .eq("startup_id", startupId)
    .eq("status", "accredited")
    .single();

  if (!accredited) return;

  // Check not already entered
  const { data: existing } = await service
    .from("competition_startups")
    .select("id")
    .eq("competition_id", competitionId)
    .eq("startup_id", startupId)
    .maybeSingle();

  if (existing) return;

  const { error } = await service.from("competition_startups").insert({
    competition_id:            competitionId,
    startup_id:                startupId,
    accreditation_request_id:  accredited.id,
  });

  if (error) {
    console.error("[enterCompetition] error:", error);
    return;
  }

  // Send confirmation email (fire-and-forget)
  try {
    const [{ data: startup }, { data: comp }] = await Promise.all([
      service.from("startups").select("org_name, email").eq("id", startupId).single(),
      service.from("competitions").select("name").eq("id", competitionId).single(),
    ]);
    if (startup?.email && comp?.name) {
      sendCompetitionEntered(startup.email, startup.org_name, comp.name).catch(
        (e) => console.error("[enterCompetition] email error:", e)
      );
    }
  } catch (e) {
    console.error("[enterCompetition] email lookup error:", e);
  }

  revalidatePath("/app/startup/competitions");
  revalidatePath("/admin/competitions");
  revalidatePath("/app/accelerator/competitions");
}

// -------------------------------------------------------
// Evaluator scores a competition entry
// -------------------------------------------------------
export async function scoreEntry(formData: FormData) {
  const competitionId = formData.get("competition_id") as string;
  const startupId     = formData.get("startup_id") as string;
  const score         = Number(formData.get("score"));

  if (!competitionId || !startupId || isNaN(score) || score < 0 || score > 100) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/en/login");

  const service = createServiceClient();

  // Resolve evaluator entity
  const { data: userProfile } = await service
    .from("user_profiles")
    .select("entity_id, role")
    .eq("user_id", user.id)
    .single();

  if (!userProfile || userProfile.role !== "evaluator") return;
  const evaluatorId = userProfile.entity_id;

  const { error } = await service.from("competition_scores").insert({
    competition_id: competitionId,
    startup_id:     startupId,
    evaluator_id:   evaluatorId,
    score,
  });

  if (error) {
    console.error("[scoreEntry] error:", error);
    return;
  }

  // Send scored notification (fire-and-forget)
  try {
    const [{ data: startup }, { data: comp }] = await Promise.all([
      service.from("startups").select("org_name, email").eq("id", startupId).single(),
      service.from("competitions").select("name").eq("id", competitionId).single(),
    ]);
    if (startup?.email && comp?.name) {
      sendEntryScored(startup.email, startup.org_name, comp.name, score).catch(
        (e) => console.error("[scoreEntry] email error:", e)
      );
    }
  } catch (e) {
    console.error("[scoreEntry] email lookup error:", e);
  }

  revalidatePath("/app/evaluator/scoring");
  revalidatePath("/admin/competitions");
}

// -------------------------------------------------------
// Admin creates a new competition
// -------------------------------------------------------
export async function createCompetition(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/en/login");

  const service = createServiceClient();

  const { error } = await service.from("competitions").insert({
    name:           formData.get("name") as string,
    description:    (formData.get("description")    as string) || null,
    industry:       (formData.get("industry")       as string) || null,
    accelerator_id: (formData.get("accelerator_id") as string) || null,
    status:         "draft",
    start_date:     (formData.get("start_date") as string) || null,
    end_date:       (formData.get("end_date")   as string) || null,
    created_by:     user.id,
  });

  if (error) {
    console.error("[createCompetition] error:", error);
    return;
  }

  revalidatePath("/admin/competitions");
  revalidatePath("/app/accelerator/competitions");
  redirect("/admin/competitions");
}

// -------------------------------------------------------
// Admin assigns an evaluator to a competition
// -------------------------------------------------------
export async function assignEvaluatorToCompetition(formData: FormData) {
  const competitionId = formData.get("competition_id") as string;
  const evaluatorId   = formData.get("evaluator_id")   as string;
  if (!competitionId || !evaluatorId) return;

  const service = createServiceClient();

  const { data: existing } = await service
    .from("competition_evaluators")
    .select("id")
    .eq("competition_id", competitionId)
    .eq("evaluator_id", evaluatorId)
    .maybeSingle();

  if (existing) return; // already assigned

  const { error } = await service
    .from("competition_evaluators")
    .insert({ competition_id: competitionId, evaluator_id: evaluatorId });

  if (error) console.error("[assignEvaluator] error:", error);

  revalidatePath(`/admin/competitions/${competitionId}`);
}

// -------------------------------------------------------
// Admin updates competition status
// -------------------------------------------------------
export async function updateCompetitionStatus(formData: FormData) {
  const competitionId = formData.get("competition_id") as string;
  const status        = formData.get("status")         as string;
  if (!competitionId || !status) return;

  const allowed = ["draft", "active", "scoring", "closed", "completed"];
  if (!allowed.includes(status)) return;

  const service = createServiceClient();

  const { error } = await service
    .from("competitions")
    .update({ status })
    .eq("id", competitionId);

  if (error) console.error("[updateCompetitionStatus] error:", error);

  revalidatePath(`/admin/competitions/${competitionId}`);
  revalidatePath("/admin/competitions");
  revalidatePath("/app/startup/competitions");
  revalidatePath("/app/accelerator/competitions");
}

// -------------------------------------------------------
// Admin publishes results — computes ranks, sends E9
// -------------------------------------------------------
export async function publishResults(formData: FormData) {
  const competitionId = formData.get("competition_id") as string;
  if (!competitionId) return;

  const service = createServiceClient();

  // Fetch all scores for this competition, average per startup
  const { data: scores } = await service
    .from("competition_scores")
    .select("startup_id, score")
    .eq("competition_id", competitionId);

  if (!scores || scores.length === 0) {
    // Still mark as completed even with no scores
    await service
      .from("competitions")
      .update({ status: "completed" })
      .eq("id", competitionId);
    revalidatePath(`/admin/competitions/${competitionId}`);
    return;
  }

  // Average scores per startup
  const avgMap = new Map<string, number>();
  const countMap = new Map<string, number>();
  for (const row of scores) {
    avgMap.set(row.startup_id,   (avgMap.get(row.startup_id)   ?? 0) + Number(row.score));
    countMap.set(row.startup_id, (countMap.get(row.startup_id) ?? 0) + 1);
  }
  const averages = Array.from(avgMap.entries()).map(([startupId, total]) => ({
    startupId,
    avg: total / (countMap.get(startupId) ?? 1),
  }));

  // Sort descending → rank 1 = highest score
  averages.sort((a, b) => b.avg - a.avg);

  // Fetch startup info for emails
  const startupIds = averages.map((r) => r.startupId);
  const [{ data: startups }, { data: comp }] = await Promise.all([
    service.from("startups").select("id, org_name, email").in("id", startupIds),
    service.from("competitions").select("name").eq("id", competitionId).single(),
  ]);

  const startupMap = new Map((startups ?? []).map((s) => [s.id, s]));

  // Mark competition completed
  await service
    .from("competitions")
    .update({ status: "completed" })
    .eq("id", competitionId);

  // Send E9 emails (fire-and-forget per startup)
  for (let i = 0; i < averages.length; i++) {
    const { startupId } = averages[i];
    const rank          = i + 1;
    const startup       = startupMap.get(startupId);

    if (startup?.email && comp?.name) {
      sendCompetitionResults(startup.email, startup.org_name, comp.name, rank).catch(
        (e) => console.error(`[publishResults] E9 error for ${startupId}:`, e)
      );
    }
  }

  revalidatePath(`/admin/competitions/${competitionId}`);
  revalidatePath("/admin/competitions");
  revalidatePath("/app/startup/competitions");
}
