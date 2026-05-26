import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/navigation/AdminNav";
import { signOut } from "@/app/actions/auth";

const ROLE_ROUTES: Record<string, string> = {
  startup: "/startup/dashboard",
  evaluator: "/evaluator/dashboard",
  accelerator: "/accelerator/dashboard",
};

export default async function AdminLayout({
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
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (profile?.role && profile.role !== "admin") {
    redirect(ROLE_ROUTES[profile.role] ?? "/login");
  }
  if (!profile?.role) redirect("/login");

  return (
    <div className="min-h-screen bg-cs-50 flex flex-col">
      <AdminNav onSignOut={async () => { "use server"; await signOut(); }} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
