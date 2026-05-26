import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  console.log(`[badge] GET /api/badge/${code}`);

  try {
    const admin = createAdminClient();

    const { data, error } = await admin
      .from("accreditation_requests")
      .select("startup_org_name, accredited_at, expires_at, unique_code, status")
      .eq("unique_code", code)
      .eq("status", "accredited")
      .single();

    if (error || !data) {
      console.warn(`[badge] not found: ${code}`, error?.message);
      return new NextResponse("Not found", { status: 404 });
    }

    const isExpired = data.expires_at && new Date(data.expires_at) < new Date();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://cred-sys.vercel.app";
    const verifyUrl = `${appUrl}/verify/${code}`;
    const year = data.accredited_at
      ? new Date(data.accredited_at).getFullYear()
      : new Date().getFullYear();

    const name =
      data.startup_org_name.length > 28
        ? data.startup_org_name.slice(0, 26) + "…"
        : data.startup_org_name;

    const accentColor = isExpired ? "#CC0000" : "#D9D3FA";
    const statusText = isExpired ? "EXPIRED" : "ACCREDITED";
    const statusColor = isExpired ? "#CC0000" : "#D9D3FA";

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="100" viewBox="0 0 320 100" role="img" aria-label="StartupCred badge for ${data.startup_org_name}">
  <title>StartupCred — ${data.startup_org_name}</title>
  <rect width="320" height="100" fill="#0A0A0A" rx="2"/>
  <rect width="4" height="100" fill="${accentColor}" rx="0"/>
  <text x="16" y="22" font-family="monospace" font-size="9" fill="#666" letter-spacing="2" text-anchor="start">STARTUPBOSS.ORG</text>
  <text x="16" y="42" font-family="monospace" font-size="16" font-weight="bold" fill="#FFFFFF" letter-spacing="1" text-anchor="start">CRED SYS</text>
  <line x1="16" y1="52" x2="304" y2="52" stroke="#222" stroke-width="1"/>
  <text x="16" y="68" font-family="monospace" font-size="10" font-weight="bold" fill="#FFFFFF" text-anchor="start">${name}</text>
  <text x="16" y="82" font-family="monospace" font-size="7.5" fill="#666" letter-spacing="1" text-anchor="start">ID: ${code} · ${year}</text>
  <rect x="232" y="58" width="72" height="18" fill="#111" rx="1"/>
  <text x="268" y="71" font-family="monospace" font-size="7.5" font-weight="bold" fill="${statusColor}" letter-spacing="1.5" text-anchor="middle">${statusText}</text>
  <a href="${verifyUrl}" target="_blank"><rect width="320" height="100" fill="transparent"/></a>
</svg>`;

    console.log(`[badge] served for ${data.startup_org_name} (${code})`);
    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (err) {
    console.error(`[badge] unexpected error for code ${code}:`, err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
