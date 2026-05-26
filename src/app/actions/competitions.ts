"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sendCompetitionEntered, sendEntryScored } from "@/lib/email/resend";

// Startup enters a competition (must be accredited)
export async function enterCompetition(formData: FormData) {
  const competitionId = formData.get("competition_id") as string;
  if (!competitionId) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  // Must be accredited
  const { data: accredited } = await admin
    .from("accreditation_requests")
    .select("id")
    .eq("startup_id", user.id)
    .eq("status", "accredited")
    .single();

  if (!accredited) return;

  // Check not already entered
  const { data: existing } = await admin
    .from("competition_entries")
    .select("id")
    .eq("competition_id", competitionId)
    .eq("startup_id", user.id)
    .maybeSingle();

  if (existing) return;

  const { error } = await admin.from("competition_entries").insert({
    competition_id: competitionId,
    startup_id: user.id,
    submitted_at: new Date().toISOString(),
  });

  if (error) {
    console.error("[enterCompetition] error:", error);
    return;
  }

  // Send confirmation email
  try {
    const { data: profile } = await admin
      .from("profiles")
      .select("org_name, email")
      .eq("user_id", user.id)
      .single();

    const { data: comp } = await admin
      .from("competitions")
      .select("title")
      .eq("id", competitionId)
      .single();

    if (profile?.email && comp?.title) {
      await sendCompetitionEntered(profile.email, profile.org_name ?? "Startup", comp.title);
    }
  } catch (e) {
    console.error("[enterCompetition] email error:", e);
  }

  revalidatePath("/startup/competitions");
  revalidatePath("/admin/competitions");
  revalidatePath("/accelerator/competitions");
}

// Evaluator scores a competition entry
export async function scoreEntry(formData: FormData) {
  const entryId = formData.get("entry_id") as string;
  const score = Number(formData.get("score"));

  if (!entryId || isNaN(score) || score < 0 || score > 100) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  const { error } = await admin
    .from("competition_entries")
    .update({
      score,
      evaluator_id: user.id,
      scored_at: new Date().toISOString(),
    })
    .eq("id", entryId);

  if (error) {
    console.error("[scoreEntry] error:", error);
    return;
  }

  // Send notification email to startup
  try {
    const { data: entry } = await admin
      .from("competition_entries")
      .select("startup_id, competition_id")
      .eq("id", entryId)
      .single();

    if (entry) {
      const [{ data: profile }, { data: comp }] = await Promise.all([
        admin.from("profiles").select("org_name, email").eq("user_id", entry.startup_id).single(),
        admin.from("competitions").select("title").eq("id", entry.competition_id).single(),
      ]);

      if (profile?.email && comp?.title) {
        await sendEntryScored(profile.email, profile.org_name ?? "Startup", comp.title, score);
      }
    }
  } catch (e) {
    console.error("[scoreEntry] email error:", e);
  }

  revalidatePath("/evaluator/scoring");
  revalidatePath("/admin/competitions");
}

// Admin creates a new competition
export async function createCompetition(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  const { error } = await admin.from("competitions").insert({
    title: formData.get("title") as string,
    description: (formData.get("description") as string) || null,
    industry: (formData.get("industry") as string) || null,
    status: "draft",
    start_date: (formData.get("start_date") as string) || null,
    end_date: (formData.get("end_date") as string) || null,
    created_by: user.id,
  });

  if (error) {
    console.error("[createCompetition] error:", error);
    return;
  }

  revalidatePath("/admin/competitions");
  revalidatePath("/accelerator/competitions");
  redirect("/admin/competitions");
}
