"use client";

import { useState }             from "react";
import { completeAccountSetup } from "@/app/actions/setup";
import type { Locale }          from "@/lib/i18n/types";

/* ─── i18n dict (client component — inline) ────────────────────── */
const DICT = {
  en: {
    passwordLabel: "Password *",
    passwordPH:    "At least 8 characters",
    confirmLabel:  "Confirm Password *",
    confirmPH:     "Repeat your password",
    submit:        "Activate Account",
    submitting:    "Activating…",
  },
  es: {
    passwordLabel: "Contraseña *",
    passwordPH:    "Mínimo 8 caracteres",
    confirmLabel:  "Confirmar Contraseña *",
    confirmPH:     "Repite tu contraseña",
    submit:        "Activar Cuenta",
    submitting:    "Activando…",
  },
} as const;

interface SetupFormProps {
  token:  string;
  locale: Locale;
}

export function SetupForm({ token, locale }: SetupFormProps) {
  const t = DICT[locale as keyof typeof DICT] ?? DICT.en;

  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await completeAccountSetup(token, formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
    // On success: server action calls redirect() — no client-side handling needed
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="cs-label">{t.passwordLabel}</label>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          placeholder={t.passwordPH}
          autoComplete="new-password"
          className="cs-input"
        />
      </div>
      <div>
        <label className="cs-label">{t.confirmLabel}</label>
        <input
          name="password_confirm"
          type="password"
          required
          minLength={8}
          placeholder={t.confirmPH}
          autoComplete="new-password"
          className="cs-input"
        />
      </div>

      {error && (
        <div className="border border-red-300 bg-red-50 px-3 py-2 text-[13px] font-mono text-red-700">
          {error}
        </div>
      )}

      <button type="submit" disabled={loading} className="btn-primary btn-lg w-full mt-2">
        {loading ? t.submitting : t.submit}
      </button>
    </form>
  );
}
