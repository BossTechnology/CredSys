import { createServiceClient } from "@/lib/supabase/service";

/** Reads the global Test Mode switch (app_settings single row). */
export async function getTestMode(): Promise<boolean> {
  const service = createServiceClient();
  const { data } = await service
    .from("app_settings")
    .select("test_mode")
    .eq("id", 1)
    .maybeSingle();
  return data?.test_mode ?? false;
}
