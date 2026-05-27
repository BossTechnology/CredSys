import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ============================================================
  // Images
  // ============================================================
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "rrhojefqjqcktgvsltvr.supabase.co" },
    ],
  },

  // ============================================================
  // Security Headers
  // ============================================================
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options",           value: "SAMEORIGIN"                        },
          { key: "X-Content-Type-Options",     value: "nosniff"                           },
          { key: "X-DNS-Prefetch-Control",     value: "on"                                },
          { key: "Referrer-Policy",            value: "strict-origin-when-cross-origin"   },
          { key: "Permissions-Policy",         value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security",  value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },

  // ============================================================
  // Redirects
  // ============================================================
  async redirects() {
    return [
      // ----------------------------------------------------------
      // Legacy portal → /app/* zones
      // ----------------------------------------------------------
      { source: "/startup/:path*",     destination: "/app/startup/:path*",     permanent: false },
      { source: "/evaluator/:path*",   destination: "/app/evaluator/:path*",   permanent: false },
      { source: "/accelerator/:path*", destination: "/app/accelerator/:path*", permanent: false },

      // ----------------------------------------------------------
      // Legacy auth → locale-prefixed
      // ----------------------------------------------------------
      { source: "/login",  destination: "/en/login",  permanent: false },
      { source: "/signup", destination: "/en/signup", permanent: false },

      // ----------------------------------------------------------
      // Wix legacy redirects
      // Add mappings from old Wix slugs as needed, e.g.:
      // { source: "/cred",      destination: "/en/getcred", permanent: true },
      // { source: "/apply",     destination: "/en/getcred", permanent: true },
      // { source: "/directory", destination: "/en/cred-list", permanent: true },
      // ----------------------------------------------------------
    ];
  },
};

export default nextConfig;
