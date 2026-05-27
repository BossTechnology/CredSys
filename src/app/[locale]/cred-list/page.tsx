import { getDictionary }    from "@/lib/i18n/loader";
import { isValidLocale }     from "@/lib/i18n/types";
import { redirect }          from "next/navigation";
import { MarketingNav }      from "@/components/marketing/MarketingNav";
import { createServiceClient } from "@/lib/supabase/service";
import Link                  from "next/link";

interface CredListPageProps {
  params: Promise<{ locale: string }>;
}

interface CredRow {
  unique_code:   string;
  accredited_at: string;
  startups: {
    org_name: string;
    industry: string | null;
    country:  string | null;
  } | null;
}

export const dynamic = "force-dynamic";

export default async function CredListPage({ params }: CredListPageProps) {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    redirect("/en");
  }

  const dict = await getDictionary(locale);

  const service = createServiceClient();
  const { data: rows } = await service
    .from("cred_pages")
    .select("unique_code, accredited_at, startups(org_name, industry, country)")
    .eq("is_active", true)
    .order("accredited_at", { ascending: false })
    .limit(200) as { data: CredRow[] | null };

  const creds = rows ?? [];

  return (
    <>
      <MarketingNav locale={locale} dict={{ nav: dict.nav }} />

      {/* Black accent strip */}
      <div className="bg-black px-7 py-1">
        <span className="text-[7px] font-mono text-sb-default uppercase tracking-widest">
          GetCRED · Build Trust · Become Unstoppable
        </span>
      </div>

      <div className="max-w-[1280px] mx-auto px-7 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-3 h-3 bg-sb-default" />
            <span className="text-[8px] font-mono text-sb-text uppercase tracking-widest font-semibold">
              {dict.credList.subtitle}
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            {dict.credList.title}
          </h1>
          <p className="text-sm text-cs-500">
            {creds.length} accredited startup{creds.length !== 1 ? "s" : ""}
          </p>
        </div>

        {creds.length === 0 ? (
          <div className="border border-cs-200 bg-white p-10 text-center">
            <p className="text-[8px] font-mono text-cs-400 uppercase tracking-widest">
              {dict.credList.noResults}
            </p>
          </div>
        ) : (
          <div className="border border-cs-200 bg-white">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_120px_140px_100px] gap-0 border-b border-cs-200 bg-cs-50 px-5 py-2">
              <span className="text-[7px] font-mono text-cs-400 uppercase tracking-widest">Organization</span>
              <span className="text-[7px] font-mono text-cs-400 uppercase tracking-widest">Industry</span>
              <span className="text-[7px] font-mono text-cs-400 uppercase tracking-widest">
                {dict.credList.credentialId}
              </span>
              <span className="text-[7px] font-mono text-cs-400 uppercase tracking-widest">
                {dict.credList.accreditedOn}
              </span>
            </div>

            {/* Rows */}
            {creds.map((row) => (
              <div
                key={row.unique_code}
                className="grid grid-cols-[1fr_120px_140px_100px] gap-0 border-b border-cs-100 px-5 py-3 hover:bg-cs-50 transition-colors items-center"
              >
                <div>
                  <span className="text-sm font-semibold tracking-tight">
                    {row.startups?.org_name ?? "—"}
                  </span>
                  {row.startups?.country && (
                    <span className="ml-2 text-[7px] font-mono text-cs-400 uppercase tracking-widest">
                      {row.startups.country}
                    </span>
                  )}
                </div>

                <span className="text-[8px] font-mono text-cs-500 uppercase tracking-widest">
                  {row.startups?.industry ?? "—"}
                </span>

                <Link
                  href={`/startup/${row.unique_code}`}
                  className="text-[8px] font-mono text-black underline underline-offset-2 hover:text-sb-text transition-colors tracking-widest"
                >
                  {row.unique_code.toUpperCase()}
                </Link>

                <span className="text-[8px] font-mono text-cs-400">
                  {new Date(row.accredited_at).toLocaleDateString(locale, {
                    year: "numeric", month: "short", day: "numeric",
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
