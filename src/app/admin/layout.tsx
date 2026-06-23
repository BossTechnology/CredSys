import { createClient }        from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAppLocale }        from "@/lib/i18n/loader";
import { redirect }            from "next/navigation";
import { AdminNav }            from "@/components/navigation/AdminNav";
import { signOut }             from "@/app/actions/auth";

export default async function AdminLayout({
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
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    const dest: Record<string, string> = {
      startup:     "/app/startup/dashboard",
      evaluator:   "/app/evaluator/dashboard",
      accelerator: "/app/accelerator/dashboard",
    };
    redirect(dest[profile?.role ?? ""] ?? "/en/login");
  }

  const locale = await getAppLocale();

  async function handleSignOut() {
    "use server";
    await signOut();
  }

  return (
    <div className="min-h-screen bg-cs-50 flex flex-col overflow-x-hidden">
      <AdminNav locale={locale} onSignOut={handleSignOut} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
