"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { UserRole } from "@/lib/supabase/types";

const PROFILE_PATHS: Record<UserRole, string[]> = {
  startup:     ["/startup/profile",     "/startup/dashboard"    ],
  evaluator:   ["/evaluator/profile",   "/evaluator/dashboard"  ],
  accelerator: ["/accelerator/profile", "/accelerator/dashboard"],
  investor:    ["/app/investor/profile", "/app/investor/dashboard"],
  admin:       ["/admin/overview"],
};

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createServiceClient();

  const orgName = formData.get("org_name") as string;
  const industry = (formData.get("industry") as string) || null;
  const website = (formData.get("website") as string) || null;
  const country = (formData.get("country") as string) || null;
  const description = (formData.get("description") as string) || null;

  if (!orgName) return;

  const { error, data } = await admin
    .from("profiles")
    .update({ org_name: orgName, industry, website, country, description })
    .eq("user_id", user.id)
    .select("role")
    .single();

  if (error) {
    console.error("[updateProfile] error:", error);
    return;
  }

  const role = (data?.role as UserRole) ?? "startup";
  const paths = PROFILE_PATHS[role] ?? ["/startup/profile"];
  paths.forEach((p) => revalidatePath(p));
}
