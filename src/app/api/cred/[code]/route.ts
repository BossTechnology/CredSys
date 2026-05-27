import { NextRequest, NextResponse } from "next/server";
import { createServiceClient }       from "@/lib/supabase/service";

/**
 * GET /api/cred/:code
 * Public JSON verification endpoint — returns credential status for programmatic checks.
 * Already listed in PUBLIC_PREFIXES in middleware (no auth required).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const upperCode = code.toUpperCase();

  const service = createServiceClient();

  const { data, error } = await service
    .from("cred_pages")
    .select("unique_code, is_active, accredited_at, expires_at, startups(org_name, industry, country, website)")
    .eq("unique_code", upperCode)
    .maybeSingle();

  if (error) {
    console.error(`[api/cred] db error for ${upperCode}:`, error.message);
  }

  if (error || !data || !data.is_active) {
    return NextResponse.json(
      { valid: false, code: upperCode, error: "Credential not found or inactive" },
      {
        status: 404,
        headers: { "Cache-Control": "public, max-age=60, s-maxage=60" },
      }
    );
  }

  const isExpired = !!data.expires_at && new Date(data.expires_at) < new Date();
  const startup   = data.startups as unknown as {
    org_name: string; industry: string | null;
    country: string | null; website: string | null;
  } | null;

  return NextResponse.json(
    {
      valid:         !isExpired,
      code:          data.unique_code,
      status:        isExpired ? "expired" : "accredited",
      accredited_at: data.accredited_at,
      expires_at:    data.expires_at ?? null,
      startup: {
        org_name: startup?.org_name ?? null,
        industry: startup?.industry ?? null,
        country:  startup?.country  ?? null,
        website:  startup?.website  ?? null,
      },
      verified_by: "startupboss.org",
      verify_url:  `${process.env.NEXT_PUBLIC_PORTAL_URL ?? "https://startupboss.org"}/startup/${upperCode}`,
    },
    {
      headers: { "Cache-Control": "public, max-age=300, s-maxage=300" },
    }
  );
}
