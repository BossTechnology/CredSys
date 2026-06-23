import { createServiceClient }                 from "@/lib/supabase/service";
import { notFound }                            from "next/navigation";
import Link                                    from "next/link";
import Image                                   from "next/image";
import { CredBadge }                           from "@/components/ui/CredBadge";
import type { Metadata }                       from "next";
import type { BLIPSVerification, ADDISVerification } from "@/lib/supabase/types";

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
    title:       orgName ? `${orgName} · CRED Verified` : `Credential ${code} · StartupBoss.org`,
    description: orgName
      ? `${orgName} is an accredited startup on StartupBoss.org. Verify their CRED credential.`
      : `Verify this CRED credential issued by StartupBoss.org.`,
    openGraph: {
      title:       orgName ? `${orgName} is CRED Accredited` : "CRED Credential",
      description: "Verified by StartupBoss.org — Accreditation Platform",
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

function countVerified(obj: BLIPSVerification | ADDISVerification | null | undefined): number {
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

  const { data: credPage } = await service
    .from("cred_pages")
    .select(`
      unique_code,
      is_active,
      accredited_at,
      expires_at,
      startups ( org_name, industry, country, website, description, logo_url ),
      accreditation_requests (
        blips_verification,
        addis_verification,
        evaluators ( org_name, website, description, country, org_type )
      )
    `)
    .eq("unique_code", upperCode)
    .maybeSingle();

  if (!credPage || !credPage.is_active) notFound();

  const startup = credPage.startups as unknown as {
    org_name: string; industry: string | null;
    country: string | null; website: string | null;
    description: string | null; logo_url: string | null;
  } | null;

  const req = credPage.accreditation_requests as unknown as {
    blips_verification: BLIPSVerification | null;
    addis_verification: ADDISVerification | null;
    evaluators: {
      org_name: string; website: string | null;
      description: string | null; country: string | null; org_type: string | null;
    } | null;
  } | null;

  const evaluator  = req?.evaluators ?? null;
  const isExpired  = !!credPage.expires_at && new Date(credPage.expires_at) < new Date();
  const blipsCount = countVerified(req?.blips_verification ?? null);
  const addisCount = countVerified(req?.addis_verification ?? null);
  const badgeUrl   = `${process.env.NEXT_PUBLIC_PORTAL_URL ?? "https://startupboss.org"}/api/badge/${upperCode}`;
  const pageUrl    = `${process.env.NEXT_PUBLIC_PORTAL_URL ?? "https://startupboss.org"}/startup/${upperCode}`;

  const blipsItems: { key: keyof BLIPSVerification; label: string }[] = [
    { key: "b", label: "Business model"    },
    { key: "l", label: "Legal compliance"  },
    { key: "i", label: "Impact"            },
    { key: "p", label: "Product"           },
    { key: "s", label: "Scalability"       },
  ];

  const addisItems: { key: keyof ADDISVerification; label: string }[] = [
    { key: "a",  label: "Addressable market"   },
    { key: "d",  label: "Data / metrics"       },
    { key: "d2", label: "Differentiation"      },
    { key: "i",  label: "Investment readiness" },
    { key: "s",  label: "Stage fit"            },
  ];

  return (
    <div className="min-h-screen bg-cs-50 text-black flex flex-col">

      {/* ── NAV ── logo + startup name + sign in */}
      <nav className="h-14 bg-white border-b border-cs-200 flex items-center px-7 shrink-0">
        <Link href="/en" className="shrink-0">
          <Image
            src="/logo.png"
            alt="StartupBoss.org"
            width={180} height={32}
            className="object-contain"
            priority
          />
        </Link>
        {startup?.org_name && (
          <span className="text-[13px] font-mono text-cs-400 uppercase tracking-widest border-l border-cs-200 ml-4 pl-4 shrink-0">
            {startup.org_name}
          </span>
        )}
        <div className="flex-1" />
        <Link
          href="/en/login"
          className="text-[12px] font-mono text-cs-400 uppercase tracking-widest hover:text-cs-btn transition-colors"
        >
          Sign In
        </Link>
      </nav>

      {/* ── MAIN ── */}
      <main className="flex-1 max-w-[860px] mx-auto w-full px-7 py-12">

        {/* Verification status header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-1 h-6 bg-sb-default" />
            <span className="text-[13px] font-mono text-sb-text uppercase tracking-widest">
              Boss.Technology Accreditation
            </span>
          </div>

          {isExpired ? (
            <h1 className="text-3xl font-bold mb-1 text-red-600 flex items-center gap-3">
              <span>⚠</span> Credential Expired
            </h1>
          ) : (
            <h1 className="text-3xl font-bold mb-1 text-black flex items-center gap-3">
              <Image src="/icon.png" alt="Boss.Technology" width={36} height={36} className="object-contain" />
              Verified Credential
            </h1>
          )}
        </div>

        {/* Badge + startup logo side by side */}
        <div className="flex items-start gap-6 justify-center mb-10">
          {startup?.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={startup.logo_url}
              alt={startup.org_name}
              className="h-[130px] w-auto max-w-[130px] object-contain border border-cs-200 bg-white p-2"
            />
          )}
          <CredBadge
            startupName={startup?.org_name ?? upperCode}
            uniqueCode={upperCode}
            accreditedAt={credPage.accredited_at}
            statusText={
              isExpired
                ? "This credential has expired."
                : "This credential is authentic and currently active."
            }
          />
        </div>

        {/* Details grid */}
        <div className="bg-white border border-cs-200 mb-6">
          <div className="px-5 py-2 border-b border-cs-200 bg-cs-50">
            <span className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
              Credential Details
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-5 p-6">
            {[
              { label: "Organization",  value: startup?.org_name,  mono: false },
              { label: "Industry",      value: startup?.industry,  mono: false },
              { label: "Country",       value: startup?.country,   mono: false },
              { label: "Credential ID", value: upperCode,          mono: true  },
              { label: "Issued",        value: fmt(credPage.accredited_at), mono: false },
              { label: "Expires",
                value: credPage.expires_at ? fmt(credPage.expires_at) : "Does not expire",
                mono: false, alert: isExpired },
            ].map((f) => (
              <div key={f.label}>
                <div className="text-[14px] font-mono text-cs-400 uppercase tracking-widest mb-1">
                  {f.label}
                </div>
                <div className={
                  f.alert  ? "text-red-600 text-[13px] font-semibold" :
                  f.mono   ? "text-sb-text font-mono text-[13px] font-bold tracking-widest" :
                             "text-black text-[14px] font-semibold capitalize"
                }>
                  {f.value ?? "—"}
                </div>
              </div>
            ))}
          </div>

          {/* About — includes website */}
          {(startup?.description || startup?.website) && (
            <div className="border-t border-cs-200 px-6 py-4">
              <div className="text-[14px] font-mono text-cs-400 uppercase tracking-widest mb-2">About</div>
              {startup?.description && (
                <p className="text-cs-600 text-[13px] leading-relaxed mb-2">{startup.description}</p>
              )}
              {startup?.website && (
                <a
                  href={startup.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sb-text text-[13px] font-mono hover:underline"
                >
                  {startup.website} ↗
                </a>
              )}
            </div>
          )}
        </div>

        {/* BLIPS / ADDIS summary */}
        <div className="bg-white border border-cs-200 mb-6">
          <div className="px-5 py-2 border-b border-cs-200 bg-cs-50">
            <span className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
              Evaluation Summary
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-cs-200">
            {/* BLIPS */}
            <div className="px-6 py-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[13px] font-mono font-bold uppercase tracking-widest">BLIPS</span>
                <span className={`text-[12px] font-mono font-bold ${blipsCount === 5 ? "text-sb-text" : "text-cs-400"}`}>
                  {blipsCount}/5
                </span>
              </div>
              <ul className="flex flex-col gap-1.5">
                {blipsItems.map(({ key, label }) => {
                  const checked = !!req?.blips_verification?.[key];
                  return (
                    <li key={key} className="flex items-center gap-2 text-[13px] font-mono">
                      <span className={`w-3 h-3 shrink-0 flex items-center justify-center text-[14px] ${
                        checked ? "bg-sb-default text-black font-bold" : "bg-cs-100 text-cs-400"
                      }`}>
                        {checked ? "✓" : "○"}
                      </span>
                      <span className={checked ? "text-cs-800" : "text-cs-400"}>{label}</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* ADDIS */}
            <div className="px-6 py-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[13px] font-mono font-bold uppercase tracking-widest">ADDIS</span>
                <span className={`text-[12px] font-mono font-bold ${addisCount === 5 ? "text-sb-text" : "text-cs-400"}`}>
                  {addisCount}/5
                </span>
              </div>
              <ul className="flex flex-col gap-1.5">
                {addisItems.map(({ key, label }) => {
                  const checked = !!req?.addis_verification?.[key];
                  return (
                    <li key={key} className="flex items-center gap-2 text-[13px] font-mono">
                      <span className={`w-3 h-3 shrink-0 flex items-center justify-center text-[14px] ${
                        checked ? "bg-sb-default text-black font-bold" : "bg-cs-100 text-cs-400"
                      }`}>
                        {checked ? "✓" : "○"}
                      </span>
                      <span className={checked ? "text-cs-800" : "text-cs-400"}>{label}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>

        {/* Evaluator profile — shown after evaluation summary */}
        {evaluator && (
          <div className="bg-white border border-cs-200 mb-6">
            <div className="px-5 py-2 border-b border-cs-200 bg-cs-50">
              <span className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
                Evaluating Organization
              </span>
            </div>
            <div className="p-6">
              <div className="text-[16px] font-bold mb-1">{evaluator.org_name}</div>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-[13px] font-mono text-cs-500 mb-3">
                {evaluator.org_type && <span className="uppercase tracking-widest">{evaluator.org_type.replace(/_/g, " ")}</span>}
                {evaluator.country  && <span>{evaluator.country}</span>}
              </div>
              {evaluator.description && (
                <p className="text-cs-600 text-[13px] leading-relaxed mb-2">{evaluator.description}</p>
              )}
              {evaluator.website && (
                <a
                  href={evaluator.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sb-text text-[13px] font-mono hover:underline"
                >
                  {evaluator.website} ↗
                </a>
              )}
            </div>
          </div>
        )}

        {/* Embed badge */}
        <div className="bg-white border border-cs-200 mb-12">
          <div className="px-5 py-2 border-b border-cs-200 bg-cs-50">
            <span className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
              Embed This Badge
            </span>
          </div>
          <div className="p-5">
            <p className="text-[13px] font-mono text-cs-500 mb-3">
              Copy the HTML below to display this credential on your website.
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <pre className="bg-cs-50 border border-cs-200 px-4 py-3 text-[12px] font-mono text-cs-600 overflow-x-auto whitespace-pre-wrap break-all select-all">
{`<a href="${pageUrl}" target="_blank" rel="noopener">
  <img src="${badgeUrl}" alt="${startup?.org_name ?? ""} — CRED Accredited" width="320" height="100" />
</a>`}
            </pre>
          </div>
        </div>

      </main>

      {/* ── FOOTER — matches homepage ── */}
      <footer className="shrink-0">
        <div className="flex items-center justify-between px-14 py-3.5 border-t border-cs-200 bg-white">
          {/* Sponsored by */}
          <div className="flex items-center gap-3.5">
            <span className="text-[13px] text-cs-600 whitespace-nowrap">Sponsored by</span>
            <div className="w-10 h-px bg-cs-600" />
            <a href="https://boss.technology" target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://static.wixstatic.com/media/e97957_e68f6e974b44435683e29d1f478057e1~mv2.png"
                alt="Boss.Technology"
                style={{ height: "38px", width: "auto", maxWidth: "200px", objectFit: "contain", display: "block" }}
              />
            </a>
          </div>
          {/* Powered by */}
          <div className="flex items-center gap-3.5">
            <span className="text-[13px] text-cs-600 whitespace-nowrap">Powered by</span>
            <div className="w-10 h-px bg-cs-600" />
            <a href="https://newrelic.com/solutions/industry/startups" target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://static.wixstatic.com/media/e97957_42d4d4509e0846d7bf96db5a50fd77dc~mv2.png"
                alt="New Relic"
                style={{ height: "26px", width: "auto", maxWidth: "140px", objectFit: "contain", display: "block" }}
              />
            </a>
          </div>
        </div>
        <div className="text-center py-2.5 bg-[#555555]">
          <p className="text-[12px] text-[#d8d8d8]">
            © 2025 Boss.Technology SAC | Powered by ❤ 🇵🇪 🇨🇴
          </p>
        </div>
      </footer>

    </div>
  );
}
