import { createServiceClient } from "@/lib/supabase/service";
import { notFound }            from "next/navigation";
import Link                    from "next/link";
import { CredBadge }           from "@/components/ui/CredBadge";
import type { Metadata }       from "next";

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const service = createServiceClient();

  const { data } = await service
    .from("cred_pages")
    .select("startups(org_name)")
    .eq("unique_code", code.toUpperCase())
    .maybeSingle();

  const orgName = (data?.startups as unknown as { org_name: string } | null)?.org_name;

  return {
    title:       orgName ? `${orgName} · CredSys Verified` : `Credential ${code} · CredSys`,
    description: orgName
      ? `${orgName} is an accredited startup on StartupBoss.org. Verify their CRED credential.`
      : `Verify this CredSys credential issued by StartupBoss.org.`,
    openGraph: {
      title:       orgName ? `${orgName} is CRED Accredited` : "CredSys Credential",
      description: "Verified by StartupBoss.org — CredSys Accreditation Platform",
    },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en", {
    month: "long", day: "numeric", year: "numeric",
  });
}

function countVerified(obj: Record<string, boolean | undefined> | null): number {
  if (!obj) return 0;
  return Object.values(obj).filter(Boolean).length;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CredentialPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const upperCode = code.toUpperCase();

  const service = createServiceClient();

  // Single query: cred_page + startup + accreditation request snapshot
  const { data: credPage } = await service
    .from("cred_pages")
    .select(`
      unique_code,
      is_active,
      accredited_at,
      expires_at,
      startups ( org_name, industry, country, website, description ),
      accreditation_requests ( blips_verification, addis_verification )
    `)
    .eq("unique_code", upperCode)
    .maybeSingle();

  if (!credPage || !credPage.is_active) notFound();

  const startup = credPage.startups as unknown as {
    org_name: string; industry: string | null;
    country: string | null; website: string | null; description: string | null;
  } | null;

  const req = credPage.accreditation_requests as unknown as {
    blips_verification: Record<string, boolean> | null;
    addis_verification: Record<string, boolean> | null;
  } | null;

  const isExpired  = !!credPage.expires_at && new Date(credPage.expires_at) < new Date();
  const blipsCount = countVerified(req?.blips_verification ?? null);
  const addisCount = countVerified(req?.addis_verification ?? null);
  const badgeUrl   = `${process.env.NEXT_PUBLIC_PORTAL_URL ?? "https://startupboss.org"}/api/badge/${upperCode}`;
  const pageUrl    = `${process.env.NEXT_PUBLIC_PORTAL_URL ?? "https://startupboss.org"}/startup/${upperCode}`;

  return (
    <div className="min-h-screen bg-black text-white">

      {/* Top nav */}
      <nav className="h-12 flex items-center px-7 border-b border-[#1a1a1a] shrink-0">
        <Link href="/en" className="text-sm font-bold tracking-tight text-white">
          StartupBoss.org
        </Link>
        <span className="text-[7px] font-mono text-[#444] uppercase tracking-widest border-l border-[#222] pl-4 ml-4">
          CredSys · Public Verification
        </span>
        <div className="flex-1" />
        <Link
          href="/en/login"
          className="text-[7.5px] font-mono text-[#555] uppercase tracking-widest hover:text-white transition-colors"
        >
          Sign In
        </Link>
      </nav>

      <main className="max-w-[860px] mx-auto px-7 py-12">

        {/* Verification status header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-1 h-6 bg-sb-default" />
            <span className="text-[8px] font-mono text-sb-default uppercase tracking-widest">
              CredSys Accreditation
            </span>
          </div>

          {isExpired ? (
            <>
              <h1 className="text-3xl font-bold mb-1 text-red-400">⚠ Credential Expired</h1>
              <p className="text-[10px] font-mono text-[#555]">
                This credential was issued by StartupBoss.org but has since expired.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold mb-1">✓ Verified Credential</h1>
              <p className="text-[10px] font-mono text-[#555]">
                This credential is authentic and currently active.
              </p>
            </>
          )}
        </div>

        {/* Badge */}
        <div className="flex justify-center mb-10">
          <CredBadge
            startupName={startup?.org_name ?? upperCode}
            uniqueCode={upperCode}
            accreditedAt={credPage.accredited_at}
          />
        </div>

        {/* Details grid */}
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] mb-6">
          <div className="px-5 py-2 border-b border-[#1a1a1a] bg-black">
            <span className="text-[7.5px] font-mono text-[#444] uppercase tracking-widest">
              Credential Details
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-10 gap-y-5 p-6">
            {[
              { label: "Organization",   value: startup?.org_name,  mono: false },
              { label: "Industry",       value: startup?.industry,  mono: false },
              { label: "Country",        value: startup?.country,   mono: false },
              { label: "Credential ID",  value: upperCode,          mono: true  },
              { label: "Issued",         value: fmt(credPage.accredited_at), mono: false },
              { label: "Expires",        value: credPage.expires_at ? fmt(credPage.expires_at) : "Does not expire",
                                         mono: false, alert: isExpired },
            ].map((f) => (
              <div key={f.label}>
                <div className="text-[6.5px] font-mono text-[#444] uppercase tracking-widest mb-1">
                  {f.label}
                </div>
                <div className={
                  f.alert  ? "text-red-400 text-[10px] font-semibold" :
                  f.mono   ? "text-sb-default font-mono text-[12px] font-bold tracking-widest" :
                             "text-white text-[11px] font-semibold capitalize"
                }>
                  {f.value ?? "—"}
                </div>
              </div>
            ))}
          </div>

          {startup?.description && (
            <div className="border-t border-[#1a1a1a] px-6 py-4">
              <div className="text-[6.5px] font-mono text-[#444] uppercase tracking-widest mb-1">About</div>
              <p className="text-[#888] text-[10px] leading-relaxed">{startup.description}</p>
            </div>
          )}

          {startup?.website && (
            <div className="border-t border-[#1a1a1a] px-6 py-4">
              <div className="text-[6.5px] font-mono text-[#444] uppercase tracking-widest mb-1">Website</div>
              <a
                href={startup.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sb-default text-[10px] font-mono hover:underline"
              >
                {startup.website} ↗
              </a>
            </div>
          )}
        </div>

        {/* BLIPS / ADDIS summary */}
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] mb-6">
          <div className="px-5 py-2 border-b border-[#1a1a1a] bg-black">
            <span className="text-[7.5px] font-mono text-[#444] uppercase tracking-widest">
              Evaluation Summary
            </span>
          </div>
          <div className="grid grid-cols-2 divide-x divide-[#1a1a1a]">
            {[
              { label: "BLIPS", count: blipsCount, total: 5,
                items: ["Business model", "Legal compliance", "Impact", "Product", "Scalability"] },
              { label: "ADDIS", count: addisCount, total: 5,
                items: ["Addressable market", "Data / metrics", "Differentiation", "Investment readiness", "Stage fit"] },
            ].map((fw) => (
              <div key={fw.label} className="px-6 py-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[8px] font-mono font-bold uppercase tracking-widest">{fw.label}</span>
                  <span className={`text-[7.5px] font-mono font-bold ${fw.count === fw.total ? "text-sb-default" : "text-[#555]"}`}>
                    {fw.count}/{fw.total}
                  </span>
                </div>
                <ul className="flex flex-col gap-1.5">
                  {fw.items.map((item, i) => {
                    const checked = i < fw.count; // approximate ordering
                    return (
                      <li key={item} className="flex items-center gap-2 text-[8px] font-mono">
                        <span className={`w-3 h-3 shrink-0 flex items-center justify-center text-[7px] ${
                          checked ? "bg-sb-default text-black font-bold" : "bg-[#1a1a1a] text-[#444]"
                        }`}>
                          {checked ? "✓" : "○"}
                        </span>
                        <span className={checked ? "text-[#ccc]" : "text-[#444]"}>{item}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Embed badge */}
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] mb-8">
          <div className="px-5 py-2 border-b border-[#1a1a1a] bg-black">
            <span className="text-[7.5px] font-mono text-[#444] uppercase tracking-widest">
              Embed This Badge
            </span>
          </div>
          <div className="p-5">
            <p className="text-[8px] font-mono text-[#555] mb-3">
              Copy the HTML below to display this credential on your website.
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <pre className="bg-black border border-[#1a1a1a] px-4 py-3 text-[7.5px] font-mono text-[#888] overflow-x-auto whitespace-pre-wrap break-all select-all">
{`<a href="${pageUrl}" target="_blank" rel="noopener">
  <img src="${badgeUrl}" alt="${startup?.org_name ?? ""} — CredSys Accredited" width="320" height="100" />
</a>`}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-3 text-[7.5px] font-mono text-[#444] uppercase tracking-widest">
          <span>Verified by</span>
          <Link href="/en" className="text-sb-default hover:underline">StartupBoss.org</Link>
          <span>·</span>
          <span>Powered by CredSys</span>
        </div>

      </main>
    </div>
  );
}
