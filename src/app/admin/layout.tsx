import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/navigation/AdminNav";
import { signOut } from "@/app/actions/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/login");

  return (
    <div className="min-h-screen bg-cs-50 flex flex-col">
      <AdminNav onSignOut={async () => { "use server"; await signOut(); }} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
