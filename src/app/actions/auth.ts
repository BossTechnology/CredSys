"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { UserRole } from "@/lib/supabase/types";

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .single();

  const role: UserRole = profile?.role ?? "startup";
  const roleRoutes: Record<UserRole, string> = {
    startup: "/startup/dashboard",
    evaluator: "/evaluator/dashboard",
    accelerator: "/accelerator/dashboard",
    admin: "/admin/overview",
  };

  revalidatePath("/", "layout");
  redirect(roleRoutes[role]);
}

export async function signUp(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const orgName = formData.get("org_name") as string;
  const role = (formData.get("role") as UserRole) ?? "startup";

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { org_name: orgName, role },
    },
  });

  if (error) return { error: error.message };
  if (!data.user) return { error: "Registration failed." };

  // Create profile row
  await supabase.from("profiles").insert({
    user_id: data.user.id,
    role,
    org_name: orgName,
    email,
    is_active: role === "startup",
  });

  revalidatePath("/", "layout");
  redirect("/startup/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
