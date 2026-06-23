import { createClient }        from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect }            from "next/navigation";
import { EvaluatorNav }        from "@/components/ui/Navigation";
import { PendingBanner }       from "@/components/ui/Navigation";
import { signOut }             from "@/app/actions/auth";
import { getAppLocale }        from "@/lib/i18n/loader";

export default async function EvaluatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/en/login");

  const service = createServiceClient();

  // Resolve profile + evaluator entity in parallel
  const { data: profile } = await service
    .from("user_profiles")
    .select("role, entity_id")
    .eq("user_id", user.id)
    .single();

  if (!profile || profile.role !== "evaluator") {
    redirect("/en/login");
  }

  const { data: evaluator } = await service
    .from("evaluators")
    .select("org_name, is_active")
    .eq("id", profile.entity_id)
    .single();

  const locale = await getAppLocale();

  async function handleSignOut() {
    "use server";
    await signOut();
  }

  return (
    <div className="min-h-screen bg-cs-50 flex flex-col overflow-x-hidden">
      <EvaluatorNav onSignOut={handleSignOut} locale={locale} />

      {evaluator && !evaluator.is_active && (
        <PendingBanner
          message="Your evaluator account is pending activation. Our team will notify you once you are activated."
          locale={locale}
        />
      )}

      <main className="flex-1">{children}</main>
    </div>
  );
}
