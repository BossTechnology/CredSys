"use server";

import { createClient }        from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect }            from "next/navigation";

/** Complete account setup: verify token → create auth user → create profile → sign in */
export async function completeAccountSetup(
  token: string,
  formData: FormData
): Promise<{ error?: string }> {
  const password        = formData.get("password") as string;
  const passwordConfirm = formData.get("password_confirm") as string;

  if (!password || password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== passwordConfirm) {
    return { error: "Passwords do not match." };
  }

  const service = createServiceClient();

  // Verify the token
  const { data: tokenRow } = await service
    .from("account_setup_tokens")
    .select("email, role, entity_id, used_at, expires_at")
    .eq("token", token)
    .single();

  if (!tokenRow) {
    return { error: "Invalid setup link." };
  }
  if (tokenRow.used_at) {
    return { error: "This setup link has already been used." };
  }
  if (new Date(tokenRow.expires_at) < new Date()) {
    return { error: "This setup link has expired. Please contact support." };
  }

  const { email, role, entity_id } = tokenRow;

  // Create the Supabase auth user
  const { data: created, error: createError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError || !created.user) {
    // If the user already exists (e.g. double-submit), try signing in instead
    if (createError?.message?.includes("already")) {
      return { error: "An account with this email already exists. Please sign in." };
    }
    console.error("[setup] createUser error:", createError);
    return { error: "Failed to create account. Please try again." };
  }

  const userId = created.user.id;

  // Create user_profiles row
  const { error: profileError } = await service.from("user_profiles").insert({
    user_id:   userId,
    role,
    entity_id,
  });

  if (profileError) {
    // Roll back — delete the just-created auth user
    await service.auth.admin.deleteUser(userId);
    console.error("[setup] profile insert error:", profileError);
    return { error: "Failed to create profile. Please try again." };
  }

  // Mark token as used
  await service
    .from("account_setup_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("token", token);

  // Sign in the new user so they land authenticated
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

  if (signInError) {
    console.error("[setup] signIn error:", signInError);
    // Don't block — user can sign in manually
    redirect("/en/login");
  }

  const ROLE_HOME: Record<string, string> = {
    startup:     "/app/startup/dashboard",
    evaluator:   "/app/evaluator/dashboard",
    accelerator: "/app/accelerator/dashboard",
    admin:       "/admin/overview",
  };

  redirect(ROLE_HOME[role] ?? "/en");
}
