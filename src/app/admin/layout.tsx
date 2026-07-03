import { createClient }        from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAppLocale }        from "@/lib/i18n/loader";
import { getTestMode }         from "@/lib/admin/test-mode";
import { redirect }            from "next/navigation";
import { AdminNav }            from "@/components/navigation/AdminNav";
import { signOut }             from "@/app/actions/auth";
import { ROLE_ROUTES }         from "@/lib/auth/role-routes";
import type { UserRole }       from "@/lib/supabase/types";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getAppLocale();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const service = createServiceClient();
  const { data: profile } = await service
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (!profile) redirect(`/${locale}/login`);
  if (profile.role !== "admin") redirect(ROLE_ROUTES[profile.role as UserRole]);

  const testMode = await getTestMode();

  async function handleSignOut() {
    "use server";
    await signOut();
  }

  return (
    <div className="min-h-screen bg-cs-50 flex flex-col overflow-x-hidden">
      <AdminNav locale={locale} onSignOut={handleSignOut} />
      {testMode && (
        <div className="bg-red-600 text-white px-4 py-2 text-center text-[12px] font-mono uppercase tracking-widest font-bold">
          ⚠ Test Mode ON — new records are flagged as test
        </div>
      )}
      <main className="flex-1">{children}</main>
    </div>
  );
}
