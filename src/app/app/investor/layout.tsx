import { createClient }        from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect }            from "next/navigation";
import { InvestorNav }         from "@/components/ui/Navigation";
import { PendingBanner }       from "@/components/ui/Navigation";
import { signOut }             from "@/app/actions/auth";

export default async function InvestorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/en/login");

  const service = createServiceClient();

  const { data: profile } = await service
    .from("user_profiles")
    .select("role, entity_id")
    .eq("user_id", user.id)
    .single();

  if (!profile || profile.role !== "investor") {
    redirect("/en/login");
  }

  const { data: investor } = await service
    .from("investors")
    .select("org_name, is_active")
    .eq("id", profile.entity_id)
    .single();

  async function handleSignOut() {
    "use server";
    await signOut();
  }

  return (
    <div className="min-h-screen bg-cs-50 flex flex-col">
      <InvestorNav onSignOut={handleSignOut} />

      {investor && !investor.is_active && (
        <PendingBanner
          message="Your investor account is pending activation. Our team will notify you once you are activated."
        />
      )}

      <main className="flex-1">{children}</main>
    </div>
  );
}
