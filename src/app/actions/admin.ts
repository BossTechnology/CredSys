"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function activateEvaluator(formData: FormData) {
  const supabase = await createServiceClient();
  const userId = formData.get("user_id") as string;
  const deactivate = formData.get("deactivate") === "true";

  await supabase
    .from("profiles")
    .update({ is_active: !deactivate, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  revalidatePath("/admin/evaluators");
}
