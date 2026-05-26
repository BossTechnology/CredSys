import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PortalNav } from "@/components/navigation/PortalNav";
import { signOut } from "@/app/actions/auth";

export default async function EvaluatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_name, role, is_active")
    .eq("user_id", user.id)
    .single();

  if (profile?.role !== "evaluator") redirect("/login");

  const navItems = [
    { label: "Dashboard", href: "/evaluator/dashboard" },
    { label: "Assignments", href: "/evaluator/assignments" },
    { label: "Profile", href: "/evaluator/profile" },
  ];

  return (
    <div className="min-h-screen bg-cs-50 flex flex-col">
      <PortalNav
        portalLabel="Evaluator Portal"
        orgName={profile?.org_name}
        items={navItems}
        onSignOut={async () => { "use server"; await signOut(); }}
      />
      {!profile?.is_active && (
        <div className="bg-sb-light border-b border-sb-default px-7 py-2 text-[8px] font-mono text-sb-text">
          <strong>Account pending activation.</strong> Our team is reviewing your profile. You will be notified when your account is activated.
        </div>
      )}
      <main className="flex-1">{children}</main>
    </div>
  );
}
