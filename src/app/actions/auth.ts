"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { UserRole } from "@/lib/supabase/types";

const ROLE_ROUTES: Record<UserRole, string> = {
  startup: "/startup/dashboard",
  evaluator: "/evaluator/dashboard",
  accelerator: "/accelerator/dashboard",
  admin: "/admin/overview",
};

async function getRoleFor(userId: string): Promise<UserRole> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("role")
    .eq("user_id", userId)
    .single();
  return (data?.role as UserRole) ?? "startup";
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  if (!data.user) return { error: "Authentication failed." };

  const role = await getRoleFor(data.user.id);

  revalidatePath("/", "layout");
  redirect(ROLE_ROUTES[role]);
}

export async function signUp(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const orgName = formData.get("org_name") as string;
  const role = ((formData.get("role") as UserRole) || "startup") as UserRole;
  const industry = formData.get("industry") as string | null;
  const website = formData.get("website") as string | null;

  if (!email || !password || !orgName) {
    return { error: "Email, password and organization name are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const admin = createAdminClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { org_name: orgName, role, industry, website },
  });
  if (createError) return { error: createError.message };
  if (!created.user) return { error: "Registration failed." };

  // Profile is auto-created by the on_auth_user_created trigger.
  if (industry || website) {
    await admin
      .from("profiles")
      .update({
        ...(industry ? { industry } : {}),
        ...(website ? { website } : {}),
      })
      .eq("user_id", created.user.id);
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) return { error: signInError.message };

  revalidatePath("/", "layout");
  redirect(ROLE_ROUTES[role]);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
