import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { PortalNav } from "@/components/navigation/PortalNav";
import { signOut } from "@/app/actions/auth";

const ROLE_ROUTES: Record<string, string> = {
  startup: "/startup/dashboard",
  evaluator: "/evaluator/dashboard",
  admin: "/admin/overview",
};

export default async function AcceleratorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("org_name, role")
    .eq("user_id", user.id)
    .single();

  if (profile?.role && profile.role !== "accelerator") {
    redirect(ROLE_ROUTES[profile.role] ?? "/login");
  }
  if (!profile?.role) redirect("/login");

  const navItems = [
    { label: "Dashboard", href: "/accelerator/dashboard" },
    { label: "Portfolio", href: "/accelerator/portfolio" },
    { label: "Competitions", href: "/accelerator/competitions" },
    { label: "Profile", href: "/accelerator/profile" },
  ];

  return (
    <div className="min-h-screen bg-cs-50 flex flex-col">
      <PortalNav
        portalLabel="Accelerator Portal"
        orgName={profile?.org_name}
        items={navItems}
        onSignOut={async () => { "use server"; await signOut(); }}
      />
      <main className="flex-1">{children}</main>
    </div>
  );
}
