import type { UserRole } from "@/lib/supabase/types";

/** Where each role lands after login / when redirected out of the wrong zone. */
export const ROLE_ROUTES: Record<UserRole, string> = {
  startup:     "/app/startup/dashboard",
  evaluator:   "/app/evaluator/dashboard",
  accelerator: "/app/accelerator/dashboard",
  investor:    "/app/investor/dashboard",
  admin:       "/admin/overview",
};
