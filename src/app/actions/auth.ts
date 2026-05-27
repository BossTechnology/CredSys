"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { UserRole } from "@/lib/supabase/types";

const ROLE_ROUTES: Record<UserRole, string> = {
  startup:     "/app/startup/dashboard",
  evaluator:   "/app/evaluator/dashboard",
  accelerator: "/app/accelerator/dashboard",
  admin:       "/admin/overview",
};

async function getRoleFor(userId: string): Promise<UserRole> {
  const service = createServiceClient();
  const { data } = await service
    .from("user_profiles")
    .select("role")
    .eq("user_id", userId)
    .single();
  return (data?.role as UserRole) ?? "startup";
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const email    = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  if (!data.user) return { error: "Authentication failed." };

  const role = await getRoleFor(data.user.id);

  revalidatePath("/", "layout");
  redirect(ROLE_ROUTES[role]);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/en/login");
}
