import { NextRequest, NextResponse } from "next/server";
import { createServiceClient }       from "@/lib/supabase/service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const upperCode = code.toUpperCase();

  try {
    const service = createServiceClient();

    // Query via cred_pages → startups join
    const { data, error } = await service
      .from("cred_pages")
      .select("unique_code, is_active, accredited_at, expires_at, startups(org_name)")
      .eq("unique_code", upperCode)
      .maybeSingle();

    if (error || !data || !data.is_active) {
      return new NextResponse("Not found", { status: 404 });
    }

    const orgName  = (data.startups as unknown as { org_name: string } | null)?.org_name ?? upperCode;
    const isExpired = !!data.expires_at && new Date(data.expires_at) < new Date();

    const portalUrl  = process.env.NEXT_PUBLIC_PORTAL_URL ?? "https://startupboss.org";
    const verifyUrl  = `${portalUrl}/startup/${upperCode}`;
    const year       = data.accredited_at
      ? new Date(data.accredited_at).getFullYear()
      : new Date().getFullYear();

    const displayName = orgName.length > 28 ? orgName.slice(0, 26) + "…" : orgName;
    const accentColor = isExpired ? "#CC0000" : "#D9D3FA";
    const statusText  = isExpired ? "EXPIRED"     : "ACCREDITED";
    const statusColor = isExpired ? "#CC0000"     : "#D9D3FA";

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="100" viewBox="0 0 320 100" role="img" aria-label="CredSys badge for ${orgName}">
  <title>CredSys — ${orgName}</title>
  <rect width="320" height="100" fill="#0A0A0A" rx="2"/>
  <rect width="4" height="100" fill="${accentColor}" rx="0"/>
  <text x="16" y="22" font-family="monospace" font-size="9" fill="#666" letter-spacing="2" text-anchor="start">STARTUPBOSS.ORG</text>
  <text x="16" y="42" font-family="monospace" font-size="16" font-weight="bold" fill="#FFFFFF" letter-spacing="1" text-anchor="start">CRED SYS</text>
  <line x1="16" y1="52" x2="304" y2="52" stroke="#222" stroke-width="1"/>
  <text x="16" y="68" font-family="monospace" font-size="10" font-weight="bold" fill="#FFFFFF" text-anchor="start">${displayName}</text>
  <text x="16" y="82" font-family="monospace" font-size="7.5" fill="#666" letter-spacing="1" text-anchor="start">ID: ${upperCode} · ${year}</text>
  <rect x="232" y="58" width="72" height="18" fill="#111" rx="1"/>
  <text x="268" y="71" font-family="monospace" font-size="7.5" font-weight="bold" fill="${statusColor}" letter-spacing="1.5" text-anchor="middle">${statusText}</text>
  <a href="${verifyUrl}" target="_blank"><rect width="320" height="100" fill="transparent"/></a>
</svg>`;

    return new NextResponse(svg, {
      headers: {
        "Content-Type":  "image/svg+xml",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (err) {
    console.error(`[badge] error for ${upperCode}:`, err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
