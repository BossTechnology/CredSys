import { createServerClient } from "@supabase/ssr";
import { createClient as createRawClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

// ============================================================
// Constants
// ============================================================

const SUPPORTED_LOCALES = ["en", "es"] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];

/** Role → home dashboard after login */
const ROLE_HOME: Record<string, string> = {
  startup:     "/app/startup/dashboard",
  evaluator:   "/app/evaluator/dashboard",
  accelerator: "/app/accelerator/dashboard",
  admin:       "/admin/overview",
};

/**
 * Protected zones: pathname prefix → required role.
 * Order matters — more specific prefixes first.
 */
const PROTECTED_ZONES: { prefix: string; role: string }[] = [
  { prefix: "/app/startup",     role: "startup"     },
  { prefix: "/app/evaluator",   role: "evaluator"   },
  { prefix: "/app/accelerator", role: "accelerator" },
  { prefix: "/admin",           role: "admin"       },
  // Legacy portal routes (active during phase transition 1→4)
  { prefix: "/startup",         role: "startup"     },
  { prefix: "/evaluator",       role: "evaluator"   },
  { prefix: "/accelerator",     role: "accelerator" },
];

/**
 * Prefixes that are ALWAYS public — skip auth + locale checks entirely.
 */
const PUBLIC_PREFIXES = [
  "/startup/",    // /startup/[code] public credential page
  "/_next/",
  "/favicon",
  "/api/cred/",
  "/api/intake/",
  "/api/badge/",
];

/**
 * Paths that skip locale redirect (they're already locale-aware or are app zones).
 */
const SKIP_LOCALE_PREFIXES = [
  "/en/", "/es/",
  "/app/", "/admin/",
  "/startup/", "/evaluator/", "/accelerator/",
  "/api/",
  "/_next/",
  "/favicon",
];

// ============================================================
// Helpers
// ============================================================

/** Create a Supabase SSR client that reads/writes cookies on the response. */
function makeSupabaseClient(request: NextRequest, response: NextResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Partial<ResponseCookie> }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options ?? {})
          );
        },
      },
    }
  );
}

/** Detect locale from Accept-Language header, falling back to "en". */
function detectLocale(request: NextRequest): Locale {
  const acceptLang = request.headers.get("accept-language") ?? "";
  for (const lang of acceptLang.split(",")) {
    const code = lang.split(";")[0].trim().toLowerCase().slice(0, 2) as Locale;
    if (SUPPORTED_LOCALES.includes(code)) return code;
  }
  return "en";
}

/** Fetch the user's role from user_profiles using the service client (bypasses RLS). */
async function getUserRole(userId: string): Promise<string | null> {
  const service = createRawClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { data } = await service
    .from("user_profiles")
    .select("role")
    .eq("user_id", userId)
    .single();
  return data?.role ?? null;
}

// ============================================================
// Middleware
// ============================================================

export async function middleware(request: NextRequest) {
  const { pathname, hostname } = request.nextUrl;

  // ----------------------------------------------------------
  // 1. Static asset fast-path
  // ----------------------------------------------------------
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // ----------------------------------------------------------
  // 2. Subdomain routing (production only)
  //    app.startupboss.org  → rewrite to /app/*
  //    admin.startupboss.org → rewrite to /admin/*
  // ----------------------------------------------------------
  const isProduction = !hostname.includes("localhost") && !hostname.includes("127.0.0.1");
  if (isProduction) {
    if (hostname.startsWith("app.") && !pathname.startsWith("/app/")) {
      const url = request.nextUrl.clone();
      url.pathname = `/app${pathname}`;
      return NextResponse.rewrite(url);
    }
    if (hostname.startsWith("admin.") && !pathname.startsWith("/admin/")) {
      const url = request.nextUrl.clone();
      url.pathname = `/admin${pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  // ----------------------------------------------------------
  // 3. Session refresh (always — keeps Supabase auth cookies fresh)
  // ----------------------------------------------------------
  const response = NextResponse.next({ request });
  const supabase  = makeSupabaseClient(request, response);
  const { data: { user } } = await supabase.auth.getUser();

  // ----------------------------------------------------------
  // 4. Locale detection for marketing routes
  //    If the path has no locale prefix and is not an app zone,
  //    redirect to /{locale}/{path}.
  // ----------------------------------------------------------
  const needsLocale = !SKIP_LOCALE_PREFIXES.some((p) => pathname.startsWith(p))
    && pathname !== "/";

  if (needsLocale || pathname === "/") {
    const locale = detectLocale(request);
    const url    = request.nextUrl.clone();
    // Avoid double-redirect: only redirect if not already prefixed
    const alreadyLocalized = SUPPORTED_LOCALES.some((l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`);
    if (!alreadyLocalized) {
      url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
      return NextResponse.redirect(url);
    }
  }

  // ----------------------------------------------------------
  // 5. Auth guard: unauthenticated user hitting a protected zone
  // ----------------------------------------------------------
  const protectedZone = PROTECTED_ZONES.find((z) => pathname.startsWith(z.prefix));

  if (protectedZone && !user) {
    const locale = detectLocale(request);
    const url    = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // ----------------------------------------------------------
  // 6. Role enforcement: authenticated user in wrong zone
  // ----------------------------------------------------------
  if (protectedZone && user) {
    const role = await getUserRole(user.id);

    if (!role) {
      // No profile yet — send to login
      const locale = detectLocale(request);
      const url    = request.nextUrl.clone();
      url.pathname = `/${locale}/login`;
      return NextResponse.redirect(url);
    }

    if (role !== protectedZone.role) {
      // Wrong zone — redirect to correct home
      const home = ROLE_HOME[role] ?? `/${detectLocale(request)}/login`;
      const url  = request.nextUrl.clone();
      url.pathname = home;
      return NextResponse.redirect(url);
    }
  }

  // ----------------------------------------------------------
  // 7. Redirect logged-in user away from auth pages
  // ----------------------------------------------------------
  const authPaths = ["/login", "/signup", "/en/login", "/es/login", "/en/signup", "/es/signup"];
  if (user && authPaths.some((p) => pathname === p || pathname.startsWith(p))) {
    const role = await getUserRole(user.id);
    if (role) {
      const home = ROLE_HOME[role];
      const url  = request.nextUrl.clone();
      url.pathname = home;
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - Static image/font assets
     */
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
