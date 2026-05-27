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
      // Only redirect known authenticated sub-paths; do NOT use
      // catch-all wildcards here because /startup/[code] is the
      // public credential verification page and must NOT be caught.
      // ----------------------------------------------------------
      { source: "/startup/dashboard",     destination: "/app/startup/dashboard",     permanent: false },
      { source: "/startup/accreditation", destination: "/app/startup/accreditation", permanent: false },
      { source: "/startup/profile",       destination: "/app/startup/profile",       permanent: false },
      { source: "/startup/competitions",  destination: "/app/startup/competitions",  permanent: false },
      { source: "/evaluator/dashboard",   destination: "/app/evaluator/dashboard",   permanent: false },
      { source: "/evaluator/assignments", destination: "/app/evaluator/assignments", permanent: false },
      { source: "/evaluator/assignments/:id", destination: "/app/evaluator/assignments/:id", permanent: false },
      { source: "/evaluator/profile",     destination: "/app/evaluator/profile",     permanent: false },
      { source: "/accelerator/dashboard", destination: "/app/accelerator/dashboard", permanent: false },
      { source: "/accelerator/profile",   destination: "/app/accelerator/profile",   permanent: false },

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
