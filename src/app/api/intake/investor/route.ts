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
    org_name, email, contact_person, phone_whatsapp,
    website, investment_focus, country, description,
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
    .from("investors")
    .select("id")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "This email is already registered. Please sign in." },
      { status: 409 }
    );
  }

  // Create investor entity (starts inactive — admin activates)
  const { data: investor, error: investorError } = await service
    .from("investors")
    .insert({
      org_name:         org_name.trim(),
      email:            email.trim().toLowerCase(),
      contact_person:   contact_person   || null,
      phone_whatsapp:   phone_whatsapp   || null,
      website:          website          || null,
      investment_focus: investment_focus || null,
      country:          country          || null,
      description:      description      || null,
      is_active:        false,
    })
    .select("id")
    .single();

  if (investorError || !investor) {
    console.error("[intake/investor] insert error:", investorError);
    return NextResponse.json({ error: "Failed to register investor." }, { status: 500 });
  }

  // Create setup token
  const { data: tokenRow, error: tokenError } = await service
    .from("account_setup_tokens")
    .insert({ email: email.trim().toLowerCase(), role: "investor", entity_id: investor.id })
    .select("token")
    .single();

  if (tokenError || !tokenRow) {
    console.error("[intake/investor] token error:", tokenError);
    return NextResponse.json({ error: "Failed to generate setup token." }, { status: 500 });
  }

  // Send E1 email
  const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL ?? "https://startupboss.org";
  const setupUrl  = `${portalUrl}/en/setup?token=${tokenRow.token}`;
  let emailSent = true;
  try {
    await sendAccountSetup(email.trim(), org_name.trim(), setupUrl);
  } catch (e) {
    emailSent = false;
    console.error("[intake/investor] email delivery failed:", e);
  }

  return NextResponse.json({ success: true, emailSent, setupUrl: emailSent ? undefined : setupUrl }, { status: 201 });
}
