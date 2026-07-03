import { createServiceClient }                 from "@/lib/supabase/service";
import { notFound }                            from "next/navigation";
import Link                                    from "next/link";
import Image                                   from "next/image";
import { CredBadge }                           from "@/components/ui/CredBadge";
import { LangDropdown }                        from "@/components/ui/LangDropdown";
import { getAppDictionary }                    from "@/lib/i18n/loader";
import type { Metadata }                       from "next";
import type { BLIPSVerification, ADDISVerification, BLIPSData, ADDISData } from "@/lib/supabase/types";

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

function fmt(iso: string | null | undefined, locale = "en") {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(locale, {
    month: "long", day: "numeric", year: "numeric",
  });
}

function countVerified(obj: BLIPSVerification | ADDISVerification | null | undefined): number {
  if (!obj) return 0;
  return Object.values(obj).filter(Boolean).length;
}

/** Flatten chassis-style category data into a single verified/total count. */
function countRichVerified(data: BLIPSData | ADDISData | null | undefined): { verified: number; total: number } {
  const items = (data ?? []).flatMap((cat) => cat.items ?? []);
  return { verified: items.filter((i) => i.verified).length, total: items.length };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CredentialPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const upperCode = code.toUpperCase();

  const { locale, dict } = await getAppDictionary();
  const t = dict.credPage;

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
        blips_data,
        addis_data,
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
    blips_data: BLIPSData | null;
    addis_data: ADDISData | null;
    evaluators: {
      org_name: string; website: string | null;
      description: string | null; country: string | null; org_type: string | null;
    } | null;
  } | null;

  const evaluator  = req?.evaluators ?? null;
  const isExpired  = !!credPage.expires_at && new Date(credPage.expires_at) < new Date();

  // Prefer the rich chassis-style data (current verification panel) when
  // present; fall back to the legacy 5-flag checklist for older records.
  const blipsRich = countRichVerified(req?.blips_data);
  const addisRich = countRichVerified(req?.addis_data);
  const useBlipsRich = blipsRich.total > 0;
  const useAddisRich = addisRich.total > 0;

  const blipsCount = useBlipsRich ? blipsRich.verified : countVerified(req?.blips_verification ?? null);
  const addisCount = useAddisRich ? addisRich.verified : countVerified(req?.addis_verification ?? null);
  const blipsTotal = useBlipsRich ? blipsRich.total : 5;
  const addisTotal = useAddisRich ? addisRich.total : 5;
  const badgeUrl   = `${process.env.NEXT_PUBLIC_PORTAL_URL ?? "https://startupboss.org"}/api/badge/${upperCode}`;
  const pageUrl    = `${process.env.NEXT_PUBLIC_PORTAL_URL ?? "https://startupboss.org"}/startup/${upperCode}`;

  const blipsItems: { key: keyof BLIPSVerification; label: string }[] = [
    { key: "b", label: t.businessModel    },
    { key: "l", label: t.legalCompliance  },
    { key: "i", label: t.impact           },
    { key: "p", label: t.product          },
    { key: "s", label: t.scalability      },
  ];

  const addisItems: { key: keyof ADDISVerification; label: string }[] = [
    { key: "a",  label: t.addressableMarket   },
    { key: "d",  label: t.dataMetrics         },
    { key: "d2", label: t.differentiation     },
    { key: "i",  label: t.investmentReadiness },
    { key: "s",  label: t.stageFit            },
  ];

  return (
    <div className="min-h-screen bg-cs-50 text-black flex flex-col">

      {/* ── NAV ── logo + startup name + lang + sign in */}
      <nav className="h-14 bg-white border-b border-cs-200 flex items-center px-7 shrink-0">
        <Link href={`/${locale}`} className="shrink-0">
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
        <div className="flex items-center gap-4">
          <LangDropdown />
          <Link
            href={`/${locale}/login`}
            className="text-[12px] font-mono text-cs-400 uppercase tracking-widest hover:text-cs-btn transition-colors"
          >
            {t.signIn}
          </Link>
        </div>
      </nav>

      {/* ── MAIN ── */}
      <main className="flex-1 max-w-[860px] mx-auto w-full px-7 py-12">

        {/* Verification status header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-1 h-6 bg-sb-default" />
            <span className="text-[13px] font-mono text-sb-text uppercase tracking-widest">
              {t.accreditationLabel}
            </span>
          </div>

          {isExpired ? (
            <h1 className="text-3xl font-bold mb-1 text-red-600 flex items-center gap-3">
              <span>⚠</span> {t.credentialExpiredTitle}
            </h1>
          ) : (
            <h1 className="text-3xl font-bold mb-1 text-black flex items-center gap-3">
              <Image src="/icon.png" alt="Boss.Technology" width={36} height={36} className="object-contain" />
              {t.verifiedCredentialTitle}
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
            statusText={isExpired ? t.credentialExpiredMsg : t.credentialActiveMsg}
          />
        </div>

        {/* Details grid */}
        <div className="bg-white border border-cs-200 mb-6">
          <div className="px-5 py-2 border-b border-cs-200 bg-cs-50">
            <span className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
              {t.credentialDetails}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-5 p-6">
            {[
              { label: t.organization,  value: startup?.org_name,  mono: false },
              { label: t.industry,      value: startup?.industry,  mono: false },
              { label: t.country,       value: startup?.country,   mono: false },
              { label: t.credentialId,  value: upperCode,          mono: true  },
              { label: t.issued,        value: fmt(credPage.accredited_at, locale), mono: false },
              { label: t.expires,
                value: credPage.expires_at ? fmt(credPage.expires_at, locale) : t.doesNotExpire,
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
              <div className="text-[14px] font-mono text-cs-400 uppercase tracking-widest mb-2">{t.about}</div>
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
              {t.evaluationSummary}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-cs-200">
            {/* BLIPS */}
            <div className="px-6 py-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[13px] font-mono font-bold uppercase tracking-widest">BLIPS</span>
                <span className={`text-[12px] font-mono font-bold ${blipsCount === blipsTotal && blipsTotal > 0 ? "text-sb-text" : "text-cs-400"}`}>
                  {blipsCount}/{blipsTotal}
                </span>
              </div>
              {useBlipsRich ? (
                <div className="flex flex-col gap-3">
                  {(req?.blips_data ?? []).map((cat) => (
                    <div key={cat.name}>
                      <div className="text-[11px] font-mono text-cs-400 uppercase tracking-widest mb-1">{cat.name}</div>
                      <ul className="flex flex-col gap-1.5">
                        {cat.items.map((item, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-[13px] font-mono">
                            <span className={`w-3 h-3 shrink-0 flex items-center justify-center text-[14px] ${
                              item.verified ? "bg-sb-default text-black font-bold" : "bg-cs-100 text-cs-400"
                            }`}>
                              {item.verified ? "✓" : "○"}
                            </span>
                            <span className={item.verified ? "text-cs-800" : "text-cs-400"}>{item.item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
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
              )}
            </div>

            {/* ADDIS */}
            <div className="px-6 py-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[13px] font-mono font-bold uppercase tracking-widest">ADDIS</span>
                <span className={`text-[12px] font-mono font-bold ${addisCount === addisTotal && addisTotal > 0 ? "text-sb-text" : "text-cs-400"}`}>
                  {addisCount}/{addisTotal}
                </span>
              </div>
              {useAddisRich ? (
                <div className="flex flex-col gap-3">
                  {(req?.addis_data ?? []).map((cat) => (
                    <div key={cat.name}>
                      <div className="text-[11px] font-mono text-cs-400 uppercase tracking-widest mb-1">{cat.name}</div>
                      <ul className="flex flex-col gap-1.5">
                        {cat.items.map((item, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-[13px] font-mono">
                            <span className={`w-3 h-3 shrink-0 flex items-center justify-center text-[14px] ${
                              item.verified ? "bg-sb-default text-black font-bold" : "bg-cs-100 text-cs-400"
                            }`}>
                              {item.verified ? "✓" : "○"}
                            </span>
                            <span className={item.verified ? "text-cs-800" : "text-cs-400"}>{item.item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
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
              )}
            </div>
          </div>
        </div>

        {/* Evaluator profile — shown after evaluation summary */}
        {evaluator && (
          <div className="bg-white border border-cs-200 mb-6">
            <div className="px-5 py-2 border-b border-cs-200 bg-cs-50">
              <span className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
                {t.evaluatingOrganization}
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
              {t.embedBadge}
            </span>
          </div>
          <div className="p-5">
            <p className="text-[13px] font-mono text-cs-500 mb-3">
              {t.embedBadgeDesc}
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
            <span className="text-[13px] text-cs-600 whitespace-nowrap">{t.sponsoredBy}</span>
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
            <span className="text-[13px] text-cs-600 whitespace-nowrap">{t.poweredBy}</span>
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
