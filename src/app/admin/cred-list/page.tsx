import { createServiceClient } from "@/lib/supabase/service";
import Link                    from "next/link";

function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
}

export default async function AdminCredListPage() {
  const service = createServiceClient();

  const { data: creds } = await service
    .from("cred_pages")
    .select("unique_code, is_active, accredited_at, expires_at, startups(org_name, email, industry, country)")
    .order("accredited_at", { ascending: false });

  const total   = creds?.length ?? 0;
  const expired = (creds ?? []).filter(
    (c) => !!c.expires_at && new Date(c.expires_at) < new Date()
  ).length;

  const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL ?? "https://startupboss.org";

  return (
    <div className="max-w-[1060px] mx-auto px-7 py-8">

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-2 h-2 bg-white" />
          <span className="text-[13px] font-mono text-cs-400 uppercase tracking-widest">Admin</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Credential List</h1>
        <p className="text-[13px] font-mono text-cs-400 mt-1">
          {total} issued · {expired} expired
        </p>
      </div>

      {/* Table */}
      <div className="bg-white border border-cs-200">
        <div className="px-5 py-2 border-b border-cs-200 bg-cs-50">
          <span className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
            Issued Credentials · {total}
          </span>
        </div>

        {total === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-[13px] font-mono text-cs-400">No credentials issued yet.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[1fr_100px_100px_110px_110px_80px] gap-4 px-5 py-2 border-b border-cs-100 bg-cs-50">
              {["Organization", "Industry", "Country", "Issued", "Expires", "Credential"].map((h) => (
                <div key={h} className="text-[14px] font-mono text-cs-400 uppercase tracking-widest">{h}</div>
              ))}
            </div>
            <div className="divide-y divide-cs-100">
              {(creds ?? []).map((c) => {
                const startup   = c.startups as unknown as {
                  org_name: string; email: string;
                  industry: string | null; country: string | null;
                } | null;
                const isExpired = !!c.expires_at && new Date(c.expires_at) < new Date();

                return (
                  <div
                    key={c.unique_code}
                    className={`grid grid-cols-[1fr_100px_100px_110px_110px_80px] gap-4 px-5 py-3 items-center ${
                      isExpired ? "bg-red-50" : ""
                    }`}
                  >
                    <div>
                      <div className="text-[13px] font-semibold">{startup?.org_name ?? "—"}</div>
                      <div className="text-[14px] font-mono text-cs-400">{startup?.email ?? ""}</div>
                    </div>
                    <div className="text-[12px] font-mono text-cs-500 capitalize">{startup?.industry ?? "—"}</div>
                    <div className="text-[12px] font-mono text-cs-500">{startup?.country ?? "—"}</div>
                    <div className="text-[12px] font-mono text-cs-400">{fmt(c.accredited_at)}</div>
                    <div className={`text-[12px] font-mono ${isExpired ? "text-red-500 font-bold" : "text-cs-400"}`}>
                      {c.expires_at ? fmt(c.expires_at) : "—"}
                    </div>
                    <div>
                      <Link
                        href={`${portalUrl}/startup/${c.unique_code}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-[12px] font-mono font-bold hover:underline ${
                          isExpired ? "text-red-400" : "text-sb-default"
                        }`}
                      >
                        {c.unique_code} ↗
                      </Link>
                      {!c.is_active && (
                        <div className="text-[14px] font-mono text-cs-400 mt-0.5 uppercase">Inactive</div>
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
