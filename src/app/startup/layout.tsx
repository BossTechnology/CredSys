import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PortalNav } from "@/components/navigation/PortalNav";
import { signOut } from "@/app/actions/auth";

export default async function StartupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_name, role")
    .eq("user_id", user.id)
    .single();

  if (profile?.role !== "startup") redirect("/login");

  const navItems = [
    { label: "Dashboard", href: "/startup/dashboard" },
    { label: "Apply", href: "/startup/apply" },
    { label: "Profile", href: "/startup/profile" },
  ];

  return (
    <div className="min-h-screen bg-cs-50 flex flex-col">
      <PortalNav
        portalLabel="Startup Portal"
        orgName={profile?.org_name}
        items={navItems}
        onSignOut={async () => { "use server"; await signOut(); }}
      />
      <main className="flex-1">{children}</main>
    </div>
  );
}
