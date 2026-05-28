import { isValidLocale }  from "@/lib/i18n/types";
import { redirect }       from "next/navigation";
import { MarketingNav }   from "@/components/marketing/MarketingNav";
import { HomepageHub }    from "@/components/marketing/HomepageHub";
import { createServiceClient } from "@/lib/supabase/service";
import type { Locale }    from "@/lib/i18n/types";
import type { CredListRow } from "@/components/marketing/HomepageHub";

interface HomePageProps {
  params:      Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export const dynamic = "force-dynamic";

export default async function HomePage({ params, searchParams }: HomePageProps) {
  const { locale }     = await params;
  const { tab }        = await searchParams;

  if (!isValidLocale(locale)) {
    redirect("/en");
  }

  // Pre-fetch CRED list for the CRED List tab
  const service = createServiceClient();
  const { data: rows } = await service
    .from("cred_pages")
    .select("unique_code, accredited_at, startups(org_name, industry, country)")
    .eq("is_active", true)
    .order("accredited_at", { ascending: false })
    .limit(200) as { data: CredListRow[] | null };

  const credList = rows ?? [];

  // Validate tab param
  const VALID_TABS = ["getcred", "accelerators", "evaluators", "investors", "cred-list"];
  const initialTab = VALID_TABS.includes(tab ?? "") ? tab : "getcred";

  return (
    <>
      <MarketingNav locale={locale as Locale} />
      <HomepageHub
        locale={locale as Locale}
        credList={credList}
        initialTab={initialTab as "getcred" | "accelerators" | "evaluators" | "investors" | "cred-list"}
      />
    </>
  );
}
