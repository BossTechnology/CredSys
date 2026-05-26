import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { CredBadge } from "@/components/ui/CredBadge";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  return {
    title: `Verify Credential ${code} · StartupCred`,
    description: `Verify the StartupCred credential ${code} issued by StartupBoss.org`,
  };
}

export default async function VerifyCredentialPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const upperCode = code.toUpperCase();

  const supabase = createAdminClient();
  const { data: req } = await supabase
    .from("accreditation_requests")
    .select("id,unique_code,status,startup_org_name,industry,country,accredited_at,expires_at,description,website")
    .eq("unique_code", upperCode)
    .eq("status", "accredited")
    .single();

  if (!req) notFound();

  const expired = req.expires_at && new Date(req.expires_at) < new Date();

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Top bar */}
      <nav className="h-12 flex items-center px-7 border-b border-cs-800">
        <Link href="/" className="text-sm font-bold tracking-tight">
          StartupBoss.org
        </Link>
        <span className="text-[8px] font-mono text-cs-600 uppercase tracking-widest border-l border-cs-700 pl-4 ml-4">
          Public Credential Verification
        </span>
        <div className="flex-1" />
        <Link href="/login">
          <Button variant="outline" size="sm" className="border-cs-700 text-cs-300 bg-transparent hover:border-white hover:text-white">
            Sign In
          </Button>
        </Link>
      </nav>

      <main className="max-w-[840px] mx-auto px-7 py-12">
        {/* Verification status */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="w-1 h-6 bg-sb-default inline-block" />
            <span className="text-[8px] font-mono text-sb-text uppercase tracking-widest">
              StartupCred Verification
            </span>
          </div>

          {expired ? (
            <div>
              <h1 className="text-3xl font-bold mb-2 text-cs-red">⚠ Credential Expired</h1>
              <p className="text-cs-400 text-[10px] font-mono">
                This credential was issued by StartupBoss but has expired.
              </p>
            </div>
          ) : (
            <div>
              <h1 className="text-3xl font-bold mb-2">✓ Verified Credential</h1>
              <p className="text-cs-400 text-[10px] font-mono">
                This credential is authentic and currently active.
              </p>
            </div>
          )}
        </div>

        {/* The Credential Badge */}
        <div className="mb-8 flex justify-center">
          <CredBadge
            startupName={req.startup_org_name}
            uniqueCode={req.unique_code}
            accreditedAt={req.accredited_at}
          />
        </div>

        {/* Details */}
        <div className="bg-cs-800 border border-cs-700 mb-6">
          <div className="bg-black border-b border-cs-700 px-4 py-2">
            <span className="text-[8px] font-mono uppercase tracking-widest text-cs-400 font-semibold">
              Credential Details
            </span>
          </div>
          <div className="grid grid-cols-2 gap-6 p-6">
            {[
              { label: "Startup", value: req.startup_org_name },
              { label: "Industry", value: req.industry },
              { label: "Country", value: req.country ?? "—" },
              { label: "Credential ID", value: req.unique_code, mono: true },
              { label: "Issued", value: formatDate(req.accredited_at) },
              {
                label: "Expires",
                value: req.expires_at ? formatDate(req.expires_at) : "—",
                alert: expired,
              },
            ].map((item) => (
              <div key={item.label}>
                <div className="text-[6.5px] font-mono text-cs-500 uppercase tracking-widest mb-1">
                  {item.label}
                </div>
                <div
                  className={
                    item.alert
                      ? "text-cs-red font-mono text-[10px]"
                      : item.mono
                      ? "text-sb-default font-mono text-[12px] font-bold"
                      : "text-white text-[11px] font-semibold capitalize"
                  }
                >
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          {req.description && (
            <div className="border-t border-cs-700 px-6 py-4">
              <div className="text-[6.5px] font-mono text-cs-500 uppercase tracking-widest mb-1">
                About
              </div>
              <p className="text-cs-300 text-[10px] leading-relaxed">{req.description}</p>
            </div>
          )}

          {req.website && (
            <div className="border-t border-cs-700 px-6 py-4">
              <div className="text-[6.5px] font-mono text-cs-500 uppercase tracking-widest mb-1">
                Website
              </div>
              <a
                href={req.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sb-default text-[10px] font-mono hover:underline"
              >
                {req.website} ↗
              </a>
            </div>
          )}
        </div>

        {/* Verification status badge */}
        <div className="flex items-center justify-center gap-3 text-[8px] font-mono text-cs-500 uppercase tracking-widest">
          <span>Verified by</span>
          <Link href="/" className="text-sb-default hover:underline">StartupBoss.org</Link>
          <span>·</span>
          <span>Powered by CredSys</span>
        </div>
      </main>
    </div>
  );
}
