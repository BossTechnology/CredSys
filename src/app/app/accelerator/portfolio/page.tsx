import { createServiceClient } from "@/lib/supabase/service";
import Link                    from "next/link";

function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en", {
    month: "short", day: "numeric", year: "numeric",
  });
}

export default async function AcceleratorPortfolioPage() {
  const service = createServiceClient();

  const { data: creds } = await service
    .from("cred_pages")
    .select("unique_code, accredited_at, expires_at, is_active, startups(org_name, industry, country, website)")
    .eq("is_active", true)
    .order("accredited_at", { ascending: false });

  const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL ?? "https://startupboss.org";
  const total     = creds?.length ?? 0;

  return (
    <div className="max-w-[960px] mx-auto px-7 py-8">

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-2 h-2 bg-sb-default" />
          <span className="text-[13px] font-mono text-cs-400 uppercase tracking-widest">
            Accelerator Portal
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Startup Portfolio</h1>
        <p className="text-[13px] font-mono text-cs-400 mt-1">
          {total} accredited startup{total !== 1 ? "s" : ""} in the ecosystem
        </p>
      </div>

      {/* Table */}
      <div className="bg-white border border-cs-200">
        <div className="px-5 py-2 border-b border-cs-200 bg-cs-50">
          <span className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
            Verified Startups · {total}
          </span>
        </div>

        {total === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-[13px] font-mono text-cs-400">No accredited startups yet.</p>
          </div>
        ) : (
          <>
            {/* Column headers */}
            <div className="grid grid-cols-[1fr_120px_100px_120px_100px] gap-4 px-5 py-2 border-b border-cs-100 bg-cs-50">
              {["Startup", "Industry", "Country", "Accredited", "Credential"].map((h) => (
                <div key={h} className="text-[14px] font-mono text-cs-400 uppercase tracking-widest">
                  {h}
                </div>
              ))}
            </div>

            <div className="divide-y divide-cs-100">
              {creds!.map((c) => {
                const startup  = c.startups as unknown as {
                  org_name: string; industry: string | null;
                  country: string | null; website: string | null;
                } | null;
                const isExpired = !!c.expires_at && new Date(c.expires_at) < new Date();

                return (
                  <div
                    key={c.unique_code}
                    className="grid grid-cols-[1fr_120px_100px_120px_100px] gap-4 px-5 py-3 items-center hover:bg-cs-50 transition-colors"
                  >
                    <div>
                      <div className="text-[13px] font-semibold">{startup?.org_name ?? "—"}</div>
                      {startup?.website && (
                        <a
                          href={startup.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[14px] font-mono text-cs-400 hover:text-sb-default"
                        >
                          {startup.website}
                        </a>
                      )}
                    </div>
                    <div className="text-[12px] font-mono text-cs-500 capitalize">
                      {startup?.industry ?? "—"}
                    </div>
                    <div className="text-[12px] font-mono text-cs-500">
                      {startup?.country ?? "—"}
                    </div>
                    <div className="text-[12px] font-mono text-cs-400">
                      {fmt(c.accredited_at)}
                    </div>
                    <div>
                      <Link
                        href={`${portalUrl}/startup/${c.unique_code}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-[12px] font-mono font-bold hover:underline ${
                          isExpired ? "text-red-500" : "text-sb-default"
                        }`}
                      >
                        {c.unique_code} ↗
                      </Link>
                      {isExpired && (
                        <div className="text-[14px] font-mono text-red-400 mt-0.5 uppercase tracking-widest">
                          Expired
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

    </div>
  );
}
