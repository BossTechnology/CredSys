"use client";

import { useState }          from "react";
import Link                   from "next/link";
import { useParams }          from "next/navigation";
import { signIn }             from "@/app/actions/auth";
import { MarketingNav }       from "@/components/marketing/MarketingNav";
import type { Locale }        from "@/lib/i18n/types";

export default function LoginPage() {
  const params  = useParams<{ locale: string }>();
  const locale  = (params.locale ?? "en") as Locale;

  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await signIn(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <>
      <MarketingNav locale={locale} />
      <div className="min-h-[calc(100vh-56px)] bg-cs-50 flex items-center justify-center px-4">
      <div className="w-full max-w-[400px]">

        {/* Header */}
        <div className="mb-8">
          <div className="bg-black text-white px-4 py-2 mb-1 inline-block">
            <span className="text-[13px] font-mono tracking-widest">
              {locale === "es" ? "Iniciar Sesión" : "Sign In"}
            </span>
          </div>
          <div className="h-0.5 bg-sb-default w-full" />
        </div>

        {/* Form */}
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="cs-label">Email Address</label>
            <input
              name="email"
              type="email"
              placeholder="you@startup.com"
              required
              autoComplete="email"
              className="cs-input"
            />
          </div>

          <div>
            <label className="cs-label">Password</label>
            <input
              name="password"
              type="password"
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="cs-input"
            />
          </div>

          {error && (
            <div className="border border-red-300 bg-red-50 px-3 py-2 text-[13px] font-mono text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary btn-lg w-full mt-2"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        {/* Footer links */}
        <div className="mt-6 text-center">
          <span className="text-[13px] font-mono text-cs-400">
            No account?{" "}
            <Link
              href={`/${locale}/getcred`}
              className="text-black underline"
            >
              Apply for Accreditation
            </Link>
          </span>
        </div>

      </div>
      </div>
    </>
  );
}
