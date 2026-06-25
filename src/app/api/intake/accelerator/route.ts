import { NextResponse }        from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendAccountSetup }    from "@/lib/email/templates/e1-account-setup";
import { normalizeUrl }        from "@/lib/utils";
import { getTestMode }         from "@/lib/admin/test-mode";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    org_name, email, contact_person, phone_whatsapp,
    industry, country, website, description, org_type,
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
    .from("accelerators")
    .select("id")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "This email is already registered. Please sign in." },
      { status: 409 }
    );
  }

  // Create accelerator entity (starts inactive — admin activates)
  const isTest = await getTestMode();
  const { data: accelerator, error: accelError } = await service
    .from("accelerators")
    .insert({
      org_name:       org_name.trim(),
      email:          email.trim().toLowerCase(),
      contact_person: contact_person || null,
      phone_whatsapp: phone_whatsapp || null,
      industry:       industry       || null,
      country:        country        || null,
      website:        normalizeUrl(website),
      description:    description    || null,
      org_type:       org_type       || null,
      is_active:      false,
      is_test:        isTest,
    })
    .select("id")
    .single();

  if (accelError || !accelerator) {
    console.error("[intake/accelerator] insert error:", accelError);
    return NextResponse.json({ error: "Failed to register accelerator." }, { status: 500 });
  }

  // Create setup token
  const { data: tokenRow, error: tokenError } = await service
    .from("account_setup_tokens")
    .insert({ email: email.trim().toLowerCase(), role: "accelerator", entity_id: accelerator.id })
    .select("token")
    .single();

  if (tokenError || !tokenRow) {
    console.error("[intake/accelerator] token error:", tokenError);
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
    console.error("[intake/accelerator] email delivery failed:", e);
  }

  return NextResponse.json({ success: true, emailSent, setupUrl: emailSent ? undefined : setupUrl }, { status: 201 });
}
