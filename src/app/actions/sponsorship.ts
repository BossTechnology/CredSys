"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { revalidatePath }      from "next/cache";
import { generateUniqueCode }  from "@/lib/utils";

export async function acceptSponsorship(formData: FormData) {
  const supabase       = createServiceClient();
  const sponsorshipId  = formData.get("sponsorship_id") as string;
  if (!sponsorshipId) return;

  // Fetch the sponsorship
  const { data: sponsorship } = await supabase
    .from("accreditation_sponsorships")
    .select("*")
    .eq("id", sponsorshipId)
    .single();

  if (!sponsorship || sponsorship.status !== "pending_startup_acceptance") return;

  // Resolve startup_id if not already set
  let startupId = sponsorship.startup_id as string | null;
  if (!startupId && sponsorship.startup_email_input) {
    const { data: startup } = await supabase
      .from("startups")
      .select("id")
      .eq("email", sponsorship.startup_email_input.toLowerCase())
      .maybeSingle();
    if (startup) startupId = startup.id;
  }

  // Create an accreditation_request if none exists
  let accreditationRequestId = sponsorship.accreditation_request_id as string | null;
  if (!accreditationRequestId && startupId) {
    // Check for existing open request
    const { data: existingReq } = await supabase
      .from("accreditation_requests")
      .select("id")
      .eq("startup_id", startupId)
      .not("status", "in", '("accredited","rejected","expired")')
      .maybeSingle();

    if (existingReq) {
      accreditationRequestId = existingReq.id;
    } else {
      // Fetch startup info for snapshot
      const { data: startup } = await supabase
        .from("startups")
        .select("org_name, email, industry, country, website, description, stage, team_size")
        .eq("id", startupId)
        .single();

      if (startup) {
        const { data: newReq } = await supabase
          .from("accreditation_requests")
          .insert({
            startup_id:    startupId,
            startup_name:  startup.org_name,
            startup_email: startup.email,
            industry:      startup.industry ?? "other",
            country:       startup.country  ?? null,
            website:       startup.website  ?? null,
            description:   startup.description ?? null,
            stage:         startup.stage    ?? null,
            team_size:     startup.team_size ?? null,
            status:        "pending_evaluator_assignment",
            blips_verification: {},
            addis_verification: {},
            e4_sent: false,
            e5_sent: false,
          })
          .select("id")
          .single();

        if (newReq) {
          accreditationRequestId = newReq.id;
        }
      }
    }
  }

  // Update sponsorship
  await supabase
    .from("accreditation_sponsorships")
    .update({
      status:                   "accepted",
      accepted_at:              new Date().toISOString(),
      startup_id:               startupId,
      accreditation_request_id: accreditationRequestId,
    })
    .eq("id", sponsorshipId);

  // Send E12 — fire and forget
  try {
    const { sendSponsorshipAccepted } = await import("@/lib/email/templates/e12-sponsorship-accepted");
    // Determine sponsor email
    let sponsorEmail: string | null = null;
    let sponsorOrg:   string        = "Sponsor";

    if (sponsorship.sponsor_investor_id) {
      const { data: inv } = await supabase
        .from("investors")
        .select("email, org_name")
        .eq("id", sponsorship.sponsor_investor_id)
        .single();
      if (inv) { sponsorEmail = inv.email; sponsorOrg = inv.org_name; }
    } else if (sponsorship.sponsor_accelerator_id) {
      const { data: acc } = await supabase
        .from("accelerators")
        .select("email, org_name")
        .eq("id", sponsorship.sponsor_accelerator_id)
        .single();
      if (acc) { sponsorEmail = acc.email; sponsorOrg = acc.org_name; }
    }

    if (sponsorEmail) {
      await sendSponsorshipAccepted(sponsorEmail, sponsorship.startup_name_input, sponsorOrg);
    }
  } catch (e) {
    console.error("[acceptSponsorship] email error", e);
  }

  revalidatePath("/app/startup/dashboard");
  revalidatePath("/admin/sponsorships");
}

export async function declineSponsorship(formData: FormData) {
  const supabase      = createServiceClient();
  const sponsorshipId = formData.get("sponsorship_id") as string;
  if (!sponsorshipId) return;

  const { data: sponsorship } = await supabase
    .from("accreditation_sponsorships")
    .select("*")
    .eq("id", sponsorshipId)
    .single();

  if (!sponsorship || sponsorship.status !== "pending_startup_acceptance") return;

  await supabase
    .from("accreditation_sponsorships")
    .update({
      status:      "declined",
      declined_at: new Date().toISOString(),
    })
    .eq("id", sponsorshipId);

  // Send E13 — fire and forget
  try {
    const { sendSponsorshipDeclined } = await import("@/lib/email/templates/e13-sponsorship-declined");
    let sponsorEmail: string | null = null;
    let sponsorOrg:   string        = "Sponsor";

    if (sponsorship.sponsor_investor_id) {
      const { data: inv } = await supabase
        .from("investors")
        .select("email, org_name")
        .eq("id", sponsorship.sponsor_investor_id)
        .single();
      if (inv) { sponsorEmail = inv.email; sponsorOrg = inv.org_name; }
    } else if (sponsorship.sponsor_accelerator_id) {
      const { data: acc } = await supabase
        .from("accelerators")
        .select("email, org_name")
        .eq("id", sponsorship.sponsor_accelerator_id)
        .single();
      if (acc) { sponsorEmail = acc.email; sponsorOrg = acc.org_name; }
    }

    if (sponsorEmail) {
      await sendSponsorshipDeclined(sponsorEmail, sponsorship.startup_name_input, sponsorOrg);
    }
  } catch (e) {
    console.error("[declineSponsorship] email error", e);
  }

  revalidatePath("/app/startup/dashboard");
  revalidatePath("/admin/sponsorships");
}
