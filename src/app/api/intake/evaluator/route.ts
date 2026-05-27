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
    website, description,
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
    .from("evaluators")
    .select("id")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "This email is already registered. Please sign in." },
      { status: 409 }
    );
  }

  // Create evaluator entity (starts inactive — admin activates)
  const { data: evaluator, error: evalError } = await service
    .from("evaluators")
    .insert({
      org_name:    org_name.trim(),
      email:       email.trim().toLowerCase(),
      industry:    industry    || null,
      country:     country     || null,
      website:     website     || null,
      description: description  || null,
      is_active:   false,
    })
    .select("id")
    .single();

  if (evalError || !evaluator) {
    console.error("[intake/evaluator] insert error:", evalError);
    return NextResponse.json({ error: "Failed to register evaluator." }, { status: 500 });
  }

  // Create setup token
  const { data: tokenRow, error: tokenError } = await service
    .from("account_setup_tokens")
    .insert({ email: email.trim().toLowerCase(), role: "evaluator", entity_id: evaluator.id })
    .select("token")
    .single();

  if (tokenError || !tokenRow) {
    console.error("[intake/evaluator] token error:", tokenError);
    return NextResponse.json({ error: "Failed to generate setup token." }, { status: 500 });
  }

  // Send E1 email
  const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL ?? "https://startupboss.org";
  const setupUrl  = `${portalUrl}/en/setup?token=${tokenRow.token}`;
  sendAccountSetup(email.trim(), org_name.trim(), setupUrl).catch(
    (e) => console.error("[intake/evaluator] email error:", e)
  );

  return NextResponse.json({ success: true }, { status: 201 });
}
