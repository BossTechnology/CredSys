import { createServerClient }  from "@supabase/ssr";
import { cookies }             from "next/headers";
import { NextResponse }        from "next/server";
import type { NextRequest }    from "next/server";
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";
import { createServiceClient } from "@/lib/supabase/service";

/** Role → home after login */
const ROLE_HOME: Record<string, string> = {
  startup:     "/app/startup/dashboard",
  evaluator:   "/app/evaluator/dashboard",
  accelerator: "/app/accelerator/dashboard",
  admin:       "/admin/overview",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> }
) {
  const { locale }    = await params;
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? null;

  // No code — bad link
  if (!code) {
    return NextResponse.redirect(`${origin}/${locale}/login?error=missing_code`);
  }

  // Exchange the PKCE code for a session
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Partial<ResponseCookie> }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options ?? {})
          );
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession error:", error.message);
    return NextResponse.redirect(`${origin}/${locale}/login?error=auth_failed`);
  }

  // Get the user to look up their role
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/${locale}/login`);
  }

  // Resolve role via service client (bypasses RLS)
  const service  = createServiceClient();
  const { data } = await service
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  const role = data?.role as string | undefined;

  // Prefer explicit `next` param, then role home, then locale home
  const destination =
    next ??
    (role ? ROLE_HOME[role] : null) ??
    `/${locale}`;

  return NextResponse.redirect(`${origin}${destination}`);
}
