import { NextRequest, NextResponse } from "next/server";
import { createServiceClient }       from "@/lib/supabase/service";
import { sendDeadlineWarning }       from "@/lib/email/templates/e10-deadline-warning";

/**
 * GET /api/cron/deadline
 * Vercel Cron — runs daily at midnight UTC.
 *
 * Responsibilities:
 *  1. Deactivate cred_pages whose expires_at has passed.
 *  2. Mark accreditation_requests as 'expired' when their expires_at has passed.
 *  3. Send E10 deadline-warning emails for requests whose deadline is within
 *     7 days and the e10_sent flag has not yet been set.
 */
export async function GET(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createServiceClient();
  const now     = new Date().toISOString();

  const results: Record<string, number | string> = {};

  // ── 1. Deactivate expired cred_pages ─────────────────────────────────────
  try {
    const { count: deactivated, error } = await service
      .from("cred_pages")
      .update({ is_active: false }, { count: "exact" })
      .lt("expires_at", now)
      .eq("is_active", true);

    if (error) throw error;
    results.cred_pages_deactivated = deactivated ?? 0;
  } catch (err) {
    console.error("[cron/deadline] cred_pages deactivation error:", err);
    results.cred_pages_deactivated = "error";
  }

  // ── 2. Expire accreditation_requests past their expires_at ───────────────
  try {
    const { count: expired, error } = await service
      .from("accreditation_requests")
      .update({ status: "expired" }, { count: "exact" })
      .lt("expires_at", now)
      .eq("status", "accredited");

    if (error) throw error;
    results.requests_expired = expired ?? 0;
  } catch (err) {
    console.error("[cron/deadline] request expiration error:", err);
    results.requests_expired = "error";
  }

  // ── 3. Send E10 deadline-warning emails ───────────────────────────────────
  try {
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Requests with a deadline within the next 7 days, not yet warned,
    // and still in an active (non-terminal) status.
    const { data: upcoming, error } = await service
      .from("accreditation_requests")
      .select("id, startup_name, startup_email, deadline")
      .lte("deadline", sevenDaysFromNow)
      .gt("deadline", now)                     // deadline hasn't passed yet
      .eq("e10_sent", false)
      .in("status", [
        "pending_evaluator_assignment",
        "ready_for_verification",
        "verification_in_progress",
      ]);

    if (error) throw error;

    let warned = 0;
    for (const req of upcoming ?? []) {
      const daysRemaining = Math.ceil(
        (new Date(req.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      try {
        await sendDeadlineWarning(
          req.startup_email,
          req.startup_name,
          req.id,
          daysRemaining
        );

        // Mark e10_sent so we never send this email again for this request
        await service
          .from("accreditation_requests")
          .update({ e10_sent: true })
          .eq("id", req.id);

        warned++;
      } catch (emailErr) {
        console.error(`[cron/deadline] E10 failed for request ${req.id}:`, emailErr);
      }
    }

    results.e10_sent = warned;
  } catch (err) {
    console.error("[cron/deadline] E10 query error:", err);
    results.e10_sent = "error";
  }

  console.log("[cron/deadline] completed", results);
  return NextResponse.json({ ok: true, ...results });
}
