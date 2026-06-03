import type { VerificationCategory, VerificationItem } from "@/lib/supabase/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface RawItem {
  item:         string;
  type?:        string;
  env?:         string;
  inEx?:        string;
  data?:        string;
  source?:      string;
  description?: string;
}

function parseSection(
  raw: Record<string, RawItem[]>,
): VerificationCategory[] {
  return Object.entries(raw).map(([name, items]) => ({
    name,
    items: (items ?? []).map((r): VerificationItem => ({
      item:        r.item        ?? "",
      type:        r.type,
      env:         r.env,
      inEx:        r.inEx,
      data:        r.data,
      source:      r.source,
      description: r.description,
      verified:    false,
    })),
  }));
}

// ─── POST /api/chassis/fetch ──────────────────────────────────────────────────

export async function POST(req: Request) {
  let url: string;
  try {
    ({ url } = await req.json());
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!url || typeof url !== "string") {
    return Response.json({ error: "URL is required" }, { status: 400 });
  }

  // Validate URL
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return Response.json({ error: "Invalid URL format" }, { status: 400 });
  }

  if (!parsed.hostname.endsWith("chass1s.com")) {
    return Response.json(
      { error: "URL must be from chass1s.com (e.g. https://www.chass1s.com/api/share/…)" },
      { status: 400 },
    );
  }

  // Fetch from chassis
  let chassisRes: Response;
  try {
    chassisRes = await fetch(parsed.toString(), {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
  } catch (e) {
    return Response.json(
      { error: "Could not reach chass1s.com — check your network or URL" },
      { status: 502 },
    );
  }

  if (!chassisRes.ok) {
    return Response.json(
      { error: `CHASS1S returned ${chassisRes.status} — check your share URL` },
      { status: 400 },
    );
  }

  let data: { blips?: Record<string, RawItem[]>; addis?: Record<string, RawItem[]> };
  try {
    data = await chassisRes.json();
  } catch {
    return Response.json({ error: "CHASS1S response is not valid JSON" }, { status: 502 });
  }

  if (!data.blips && !data.addis) {
    return Response.json(
      { error: "CHASS1S data does not contain BLIPS or ADDIS sections" },
      { status: 400 },
    );
  }

  const blips: VerificationCategory[] = data.blips ? parseSection(data.blips) : [];
  const addis: VerificationCategory[] = data.addis ? parseSection(data.addis) : [];

  return Response.json({ blips, addis });
}
