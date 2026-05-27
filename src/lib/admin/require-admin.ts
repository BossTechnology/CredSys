import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { User } from "@supabase/supabase-js";

/**
 * requireAdmin — Auth guard for admin-only routes.
 *
 * Reads the current session, then verifies the user has role = 'admin'
 * in the user_profiles table using the service client (bypasses RLS).
 *
 * Returns the User object if the caller is an admin, or null otherwise.
 * Use redirect() in the calling page/route if null is returned.
 */
export async function requireAdmin(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const service = createServiceClient();
  const { data } = await service
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (data?.role !== "admin") return null;

  return user;
}
