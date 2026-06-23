"use client";

import { useState }          from "react";
import Link                   from "next/link";
import { useParams }          from "next/navigation";
import { MarketingNav }       from "@/components/marketing/MarketingNav";
import type { Locale }        from "@/lib/i18n/types";

/* ─── Industry options ─────────────────────────────────────────── */
const INDUSTRY_OPTIONS = [
  { value: "fintech",    label: "Fintech"       },
  { value: "edtech",     label: "Edtech"        },
  { value: "healthtech", label: "Healthtech"    },
  { value: "agritech",   label: "Agritech"      },
  { value: "ecommerce",  label: "E-Commerce"    },
  { value: "saas",       label: "SaaS / B2B"    },
  { value: "cleantech",  label: "Cleantech"     },
  { value: "logistics",  label: "Logistics"     },
  { value: "other",      label: "Otra / Other"  },
];

/* ─── i18n dict ────────────────────────────────────────────────── */
const DICT = {
  en: {
    titlePre:  "Request a",
    titlePost: "itation",
    subtitle:  "Submit your startup to the CRED evaluation process.",
    orgName:           "Startup Name",
    orgNamePH:         "Acme Inc.",
    website:           "Website / URL",
    websitePH:         "yourstartup.com",
    contactPerson:     "Contact Person",
    contactPersonPH:   "John Doe",
    contactRole:       "Role / Position",
    contactRolePH:     "CEO",
    email:             "Email Address",
    emailPH:           "you@startup.com",
    whatsapp:          "WhatsApp",
    whatsappPH:        "+1 555 000 0000",
    industry:          "Industry",
    industryPH:        "Select industry…",
    description:       "Brief Description",
    descriptionPH:     "Describe your product, market and traction…",
    subscribe:         "Add our Startup to your contact list and keep us informed about upcoming meetings and events.",
    submit:            "Submit Application",
    submitting:        "Submitting…",
    cancel:            "Cancel",
    successTitle:      "Application Received",
    successMsg:        "Check your inbox for an activation link. Click it to set up your password and access your startup dashboard.",
    successMsgNoEmail: "Your application was saved, but we had trouble sending the activation email. Use the link below to set up your account directly — valid for 7 days.",
    activateBtn:       "Activate My Account →",
    backHome:          "← Back to home",
  },
  es: {
    titlePre:  "Solicitar a",
    titlePost: "itación",
    subtitle:  "Envía tu startup al proceso de evaluación CRED.",
    orgName:           "Nombre de la Startup",
    orgNamePH:         "Acme Inc.",
    website:           "Website / URL / Link",
    websitePH:         "tustartup.com",
    contactPerson:     "Persona de contacto",
    contactPersonPH:   "Juan García",
    contactRole:       "Puesto / Cargo",
    contactRolePH:     "CEO",
    email:             "e-Mail",
    emailPH:           "tu@startup.com",
    whatsapp:          "WhatsApp",
    whatsappPH:        "+51 999 999 999",
    industry:          "Industria Principal",
    industryPH:        "Seleccionar industria…",
    description:       "Descripción Breve",
    descriptionPH:     "Describe tu producto, mercado y tracción…",
    subscribe:         "Agregue nuestra Startup a su lista de contactos y manténganos informados sobre próximas reuniones y eventos.",
    submit:            "Enviar Solicitud",
    submitting:        "Enviando…",
    cancel:            "Cancelar",
    successTitle:      "Solicitud Recibida",
    successMsg:        "Revisa tu bandeja de entrada para el enlace de activación. Haz clic en él para configurar tu contraseña y acceder a tu dashboard.",
    successMsgNoEmail: "Tu solicitud fue guardada, pero hubo un problema al enviar el correo de activación. Usa el enlace de abajo para configurar tu cuenta directamente — válido por 7 días.",
    activateBtn:       "Activar Mi Cuenta →",
    backHome:          "← Volver al inicio",
  },
};

/* ─── Page ─────────────────────────────────────────────────────── */
export default function GetCredPage() {
  const params = useParams<{ locale: string }>();
  const locale = (params.locale ?? "en") as Locale;
  const t      = DICT[locale as keyof typeof DICT] ?? DICT.en;

  const [step,      setStep]      = useState<"form" | "success">("form");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(true);
  const [setupUrl,  setSetupUrl]  = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const body: Record<string, string | boolean> = {};
    fd.forEach((val, key) => {
      if (typeof val === "string" && val.trim()) body[key] = val.trim();
    });
    body.subscribe_events = fd.get("subscribe_events") === "on";

    try {
      const res  = await fetch("/api/intake/startup", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Something went wrong.");
      } else {
        setEmailSent(json.emailSent !== false);
        setSetupUrl(json.setupUrl ?? null);
        setStep("success");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  /* ── Success screen ── */
  if (step === "success") {
    return (
      <>
        <MarketingNav locale={locale} showSignIn={false} />
        <div className="min-h-[80vh] flex items-center justify-center px-4">
          <div className="max-w-[480px] w-full text-center">
            <div className="w-10 h-10 mx-auto mb-6" style={{ background: "rgb(156,139,188)" }} />
            <h1 className="text-2xl font-bold tracking-tight mb-3">{t.successTitle}</h1>
            {emailSent ? (
              <p className="text-[14px] text-cs-500 leading-relaxed mb-6">{t.successMsg}</p>
            ) : (
              <div className="mb-6">
                <p className="text-[14px] text-cs-500 leading-relaxed mb-4">{t.successMsgNoEmail}</p>
                {setupUrl && (
                  <a href={setupUrl}
                     className="inline-block bg-black text-white text-[13px] font-mono uppercase tracking-widest px-5 py-2.5 hover:bg-cs-800 transition-colors">
                    {t.activateBtn}
                  </a>
                )}
              </div>
            )}
            <Link href={`/${locale}`}
                  className="text-[13px] font-mono text-cs-400 uppercase tracking-widest hover:text-black transition-colors">
              {t.backHome}
            </Link>
          </div>
        </div>
      </>
    );
  }

  /* ── Form screen ── */
  return (
    <>
      <MarketingNav locale={locale} showSignIn={false} />

      <div className="max-w-[600px] mx-auto px-4 sm:px-7 py-10">

        {/* Title */}
        <div className="mb-8">
          <h1 className="text-[28px] font-bold tracking-tight mb-1">
            {t.titlePre}
            <span style={{ color: "rgb(156,139,188)" }}>CRED</span>
            {t.titlePost}
          </h1>
          <p className="text-[13px] text-cs-400">{t.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* Startup Name */}
          <div>
            <label className="cs-label">{t.orgName} *</label>
            <input name="org_name" type="text" required
                   placeholder={t.orgNamePH} className="cs-input" />
          </div>

          {/* Website */}
          <div>
            <label className="cs-label">{t.website}</label>
            <input name="website" type="text"
                   placeholder={t.websitePH} className="cs-input" />
          </div>

          {/* Contact person + Role */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="cs-label">{t.contactPerson}</label>
              <input name="contact_person" type="text"
                     placeholder={t.contactPersonPH} className="cs-input" />
            </div>
            <div>
              <label className="cs-label">{t.contactRole}</label>
              <input name="contact_role" type="text"
                     placeholder={t.contactRolePH} className="cs-input" />
            </div>
          </div>

          {/* Email + WhatsApp */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="cs-label">{t.email} *</label>
              <input name="email" type="email" required autoComplete="email"
                     placeholder={t.emailPH} className="cs-input" />
            </div>
            <div>
              <label className="cs-label">{t.whatsapp}</label>
              <input name="phone_whatsapp" type="tel"
                     placeholder={t.whatsappPH} className="cs-input" />
            </div>
          </div>

          {/* Industry */}
          <div>
            <label className="cs-label">{t.industry}</label>
            <select name="industry" className="cs-input">
              <option value="">{t.industryPH}</option>
              {INDUSTRY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="cs-label">{t.description}</label>
            <textarea name="description" rows={3}
                      placeholder={t.descriptionPH}
                      className="cs-input resize-none" />
          </div>

          {/* Subscribe / consent checkbox */}
          <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
            <input
              type="checkbox"
              name="subscribe_events"
              style={{
                marginTop:   "2px",
                accentColor: "rgb(156,139,188)",
                width:       "15px",
                height:      "15px",
                flexShrink:  0,
              }}
            />
            <span className="text-[13px] text-cs-600 leading-snug">{t.subscribe}</span>
          </label>

          {/* Error */}
          {error && (
            <div className="border border-cs-red-200 bg-cs-red-100 px-3 py-2 text-[13px] font-mono text-cs-red">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-5 pt-2">
            <button type="submit" disabled={loading} className="btn-primary btn-lg">
              {loading ? t.submitting : t.submit}
            </button>
            <Link href={`/${locale}`}
                  className="text-[13px] font-mono text-cs-400 tracking-widest hover:text-black transition-colors">
              {t.cancel}
            </Link>
          </div>

        </form>
      </div>
    </>
  );
}
