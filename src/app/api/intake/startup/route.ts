import { NextResponse }        from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendAccountSetup }    from "@/lib/email/templates/e1-account-setup";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    org_name, email, industry, country,
    website, description, stage, team_size,
  } = body as Record<string, string>;

  if (!org_name?.trim() || !email?.trim()) {
    return NextResponse.json(
      { error: "org_name and email are required." },
      { status: 400 }
    );
  }

  const service = createServiceClient();

  // Duplicate check
  const { data: existing } = await service
    .from("startups")
    .select("id")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "This email is already registered. Please sign in." },
      { status: 409 }
    );
  }

  // Create startup entity
  const { data: startup, error: startupError } = await service
    .from("startups")
    .insert({
      org_name:    org_name.trim(),
      email:       email.trim().toLowerCase(),
      industry:    industry   || null,
      country:     country    || null,
      website:     website    || null,
      description: description || null,
      stage:       stage      || null,
      team_size:   team_size  ? Number(team_size) : null,
    })
    .select("id")
    .single();

  if (startupError || !startup) {
    console.error("[intake/startup] insert error:", startupError);
    return NextResponse.json({ error: "Failed to register startup." }, { status: 500 });
  }

  // Create setup token
  const { data: tokenRow, error: tokenError } = await service
    .from("account_setup_tokens")
    .insert({ email: email.trim().toLowerCase(), role: "startup", entity_id: startup.id })
    .select("token")
    .single();

  if (tokenError || !tokenRow) {
    console.error("[intake/startup] token error:", tokenError);
    return NextResponse.json({ error: "Failed to generate setup token." }, { status: 500 });
  }

  // Send E1 email — await so we can surface delivery failures
  const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL ?? "https://startupboss.org";
  const setupUrl  = `${portalUrl}/en/setup?token=${tokenRow.token}`;
  let emailSent = true;
  try {
    await sendAccountSetup(email.trim(), org_name.trim(), setupUrl);
  } catch (e) {
    emailSent = false;
    console.error("[intake/startup] email delivery failed:", e);
  }

  return NextResponse.json({ success: true, emailSent, setupUrl: emailSent ? undefined : setupUrl }, { status: 201 });
}
