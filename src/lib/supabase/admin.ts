import { createClient } from "@supabase/supabase-js";

/**
 * Admin client — uses the service role key.
 * Only use this in trusted server-side code. Never expose to the client.
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
