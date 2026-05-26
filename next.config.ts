import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "rrhojefqjqcktgvsltvr.supabase.co" },
    ],
  },
};

export default nextConfig;
