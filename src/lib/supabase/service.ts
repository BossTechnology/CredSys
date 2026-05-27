import { createClient } from "@supabase/supabase-js";

/**
 * Standalone service-role client — no cookies, no session context.
 * Use this in Server Actions, Route Handlers, Edge Functions, and
 * any context where you need full DB access without a user session.
 * Never expose this to the client.
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
