import { createClient }        from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect }            from "next/navigation";
import { AcceleratorNav }      from "@/components/ui/Navigation";
import { PendingBanner }       from "@/components/ui/Navigation";
import { signOut }             from "@/app/actions/auth";

export default async function AcceleratorLayout({
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

  if (!profile || profile.role !== "accelerator") {
    redirect("/en/login");
  }

  const { data: accelerator } = await service
    .from("accelerators")
    .select("org_name, is_active")
    .eq("id", profile.entity_id)
    .single();

  async function handleSignOut() {
    "use server";
    await signOut();
  }

  return (
    <div className="min-h-screen bg-cs-50 flex flex-col">
      <AcceleratorNav onSignOut={handleSignOut} />

      {accelerator && !accelerator.is_active && (
        <PendingBanner
          message="Your accelerator account is pending activation. Our team will notify you once you are activated."
        />
      )}

      <main className="flex-1">{children}</main>
    </div>
  );
}
