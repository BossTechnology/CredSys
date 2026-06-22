"use client";

import { useState }          from "react";
import Link                   from "next/link";
import { useParams }          from "next/navigation";
import { signIn }             from "@/app/actions/auth";
import { MarketingNav }       from "@/components/marketing/MarketingNav";
import type { Locale }        from "@/lib/i18n/types";

/* ─── i18n dict (client component — inline) ────────────────────── */
const DICT = {
  en: {
    emailLabel:  "Email Address",
    emailPH:     "you@startup.com",
    passwordLabel: "Password",
    passwordPH:  "••••••••",
    submit:      "Sign In",
    submitting:  "Signing in…",
    noAccount:   "No account?",
    applyLink:   "Apply for Accreditation",
  },
  es: {
    emailLabel:  "Correo Electrónico",
    emailPH:     "tu@startup.com",
    passwordLabel: "Contraseña",
    passwordPH:  "••••••••",
    submit:      "Iniciar Sesión",
    submitting:  "Iniciando sesión…",
    noAccount:   "¿No tienes cuenta?",
    applyLink:   "Solicitar Acreditación",
  },
} as const;

export default function LoginPage() {
  const params  = useParams<{ locale: string }>();
  const locale  = (params.locale ?? "en") as Locale;
  const t       = DICT[locale as keyof typeof DICT] ?? DICT.en;

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
      <MarketingNav locale={locale} showSignIn={false} />
      <div className="min-h-[calc(100vh-56px)] bg-cs-50 flex items-center justify-center px-4">
      <div className="w-full max-w-[400px]">

        {/* Form */}
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="cs-label">{t.emailLabel}</label>
            <input
              name="email"
              type="email"
              placeholder={t.emailPH}
              required
              autoComplete="email"
              className="cs-input"
            />
          </div>

          <div>
            <label className="cs-label">{t.passwordLabel}</label>
            <input
              name="password"
              type="password"
              placeholder={t.passwordPH}
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
            {loading ? t.submitting : t.submit}
          </button>
        </form>

        {/* Footer links */}
        <div className="mt-6 text-center">
          <span className="text-[13px] font-mono text-cs-400">
            {t.noAccount}{" "}
            <Link
              href={`/${locale}/getcred`}
              className="cs-link"
            >
              {t.applyLink}
            </Link>
          </span>
        </div>

      </div>
      </div>
    </>
  );
}
