"use client";

import { useState, useRef, useEffect } from "react";
import Image           from "next/image";
import Link            from "next/link";
import type { Locale } from "@/lib/i18n/types";

// ─── Types ───────────────────────────────────────────────────────────────────

export type Tab = "getcred" | "accelerators" | "evaluators" | "investors" | "cred-list";

export interface CredListRow {
  unique_code:   string;
  accredited_at: string;
  startups: { org_name: string; industry: string | null; country: string | null } | null;
}

interface Props {
  locale:      Locale;
  credList:    CredListRow[];
  initialTab?: Tab;
}

// ─── Design tokens (from Wix source analysis) ─────────────────────────────────

const F_LIGHT  = "'avenir-lt-w01_35-light1475496', sans-serif";
const F_HEAVY  = "'avenir-lt-w01_85-heavy1475544', sans-serif";
const C_TEXT   = "rgb(64,64,64)";          // color_15
const C_MUTED  = "rgb(158,158,158)";       // color_13 — inactive tabs + placeholders + borders
const C_PURPLE = "rgb(156,139,188)";       // color_42 — subtitle, submit button, focus, links
const C_BLK    = "#000";
const C_WHITE  = "#fff";

// ─── Tab / resource configuration ─────────────────────────────────────────────

const TABS: { id: Tab; en: string; es: string }[] = [
  { id: "getcred",      en: "Get Cred",     es: "Get Cred"       },
  { id: "accelerators", en: "Accelerators", es: "Aceleradoras"   },
  { id: "evaluators",   en: "Evaluators",   es: "Evaluadores"    },
  { id: "investors",    en: "Investors",     es: "Inversionistas" },
  { id: "cred-list",   en: "Cred List",     es: "Lista CRED"    },
];

const SUBTITLES: Record<Tab, { en: string; es: string }> = {
  getcred:      { en: "Apply for acCREDitation",  es: "Solicitar aCREDitación" },
  accelerators: { en: "Join StartupBoss",          es: "Únete a StartupBoss"    },
  evaluators:   { en: "Join StartupBoss",          es: "Únete a StartupBoss"    },
  investors:    { en: "Join StartupBoss",          es: "Únete a StartupBoss"    },
  "cred-list":  { en: "CRED List",                 es: "CRED List"              },
};

const RESOURCES: Record<Tab, Array<{ titleEs: string; titleEn: string; descEs: string; descEn: string; url: string }>> = {
  getcred: [
    {
      titleEs: "StartupBoss.org Visión", titleEn: "StartupBoss.org Vision",
      descEs: "Por qué la CREDibilidad es el nuevo estándar para los startups en Latam y cómo Business Observability lo hace posible.",
      descEn: "Why credibility is the new standard for startups in LatAm and how Business Observability makes it possible.",
      url: "https://17714349-d442-4dcd-bf37-bf7e4c696099.filesusr.com/ugd/e97957_e7fe11c2b7da4a28a6992d4414f17abc.pdf",
    },
    {
      titleEs: "Guía de acCREDitación", titleEn: "acCREDitation Guide",
      descEs: "Una guía paso a paso sobre cómo transformar la transparencia a un Startup Superpoder",
      descEn: "A step-by-step guide on how to transform transparency into a Startup Superpower",
      url: "https://17714349-d442-4dcd-bf37-bf7e4c696099.filesusr.com/ugd/e97957_2d22bff5fa7940c2b47bca1c2ee497d0.pdf",
    },
  ],
  accelerators: [
    {
      titleEs: "Carta para Aceleradoras", titleEn: "Open Letter to Accelerators",
      descEs: "Un mensaje que explica por qué StartupCred es esencial para mejorar la calidad, credibilidad y preparación real de los aplicantes y de sus cohortes.",
      descEn: "A message explaining why StartupCred is essential to improve quality, credibility, and real readiness of applicants and cohorts.",
      url: "https://17714349-d442-4dcd-bf37-bf7e4c696099.filesusr.com/ugd/e97957_667406918e864ebab36c1bab9d2e7c16.pdf",
    },
    {
      titleEs: "Guía para Aceleradoras", titleEn: "Accelerator Guide",
      descEs: "Una guía práctica que muestra cómo integrar StartupCred en los procesos de aplicación, eventos de pitch y programas de aceleración.",
      descEn: "A practical guide showing how to integrate StartupCred into application processes, pitch events, and acceleration programs.",
      url: "https://17714349-d442-4dcd-bf37-bf7e4c696099.filesusr.com/ugd/e97957_fc5164663db449de9c7c4832f7696f10.pdf",
    },
  ],
  evaluators: [
    {
      titleEs: "Intro para Evaluadores", titleEn: "Evaluator Intro",
      descEs: "Un mensaje que invita a organizaciones comunitarias confiables a convertirse en Evaluators oficiales y verificadores independientes de StartupCred.",
      descEn: "An invitation to trusted community organizations to become official Evaluators and independent StartupCred verifiers.",
      url: "https://17714349-d442-4dcd-bf37-bf7e4c696099.filesusr.com/ugd/e97957_13323aa9fb004d8aa116ea5c14f04eb6.pdf",
    },
    {
      titleEs: "Guía para Evaluators", titleEn: "Evaluator Guide",
      descEs: "Manual completo que explica paso a paso cómo realizar entrevistas, revisar dashboards de Observability y acreditar startups.",
      descEn: "A complete manual explaining step-by-step how to conduct interviews, review Observability dashboards, and accredit startups.",
      url: "https://17714349-d442-4dcd-bf37-bf7e4c696099.filesusr.com/ugd/e97957_5e47ec908b594ccd85616c03948f16b4.pdf",
    },
  ],
  investors: [
    {
      titleEs: "Carta para Inversionistas", titleEn: "Open Letter to Investors",
      descEs: "Un mensaje para los inversionistas que invita a elevar el estándar de verdad, transparencia y evidencia real en la evaluación de startups.",
      descEn: "A message inviting investors to elevate the standard of truth, transparency, and real evidence in startup evaluation.",
      url: "https://17714349-d442-4dcd-bf37-bf7e4c696099.filesusr.com/ugd/e97957_3c43b71a52924ad0a925467a3467fe19.pdf",
    },
    {
      titleEs: "Guía para Inversionistas", titleEn: "Investor Guide",
      descEs: "Guía práctica y detallada que explica cómo los inversionistas pueden verificar startups usando Business Observability e incorporar StartupCred.",
      descEn: "A detailed practical guide explaining how investors can verify startups using Business Observability and incorporate StartupCred.",
      url: "https://17714349-d442-4dcd-bf37-bf7e4c696099.filesusr.com/ugd/e97957_d1eca7ec1e1c4d6eb68c1044112f6c84.pdf",
    },
  ],
  "cred-list": [],
};

// ─── Dropdown options ─────────────────────────────────────────────────────────

const INDUSTRY_OPTS = [
  { v: "fintech",    l: "Fintech"       }, { v: "edtech",     l: "Edtech"        },
  { v: "healthtech", l: "Healthtech"    }, { v: "agritech",   l: "Agritech"      },
  { v: "ecommerce",  l: "E-Commerce"   }, { v: "saas",       l: "SaaS / B2B"   },
  { v: "cleantech",  l: "Cleantech"    }, { v: "logistics",  l: "Logistics"     },
  { v: "other",      l: "Otro / Other" },
];
const ACCEL_OPTS = [
  { v: "university",  l: "Universitaria / University"  }, { v: "corporate",   l: "Corporativa / Corporate" },
  { v: "independent", l: "Independiente / Independent" }, { v: "government",  l: "Gubernamental / Government" },
  { v: "other",       l: "Otro / Other"                },
];
const EVAL_OPTS = [
  { v: "startup_consulting",        l: "Consultora de Startups"    },
  { v: "women_in_tech",             l: "Mujeres en Tecnología"    },
  { v: "fintech_chamber",           l: "Cámara Fintech"           },
  { v: "ecommerce_chamber",         l: "Cámara de E-Commerce"    },
  { v: "innovation_hub",            l: "Hub de Innovación"        },
  { v: "tech_association",          l: "Asociación Tecnológica"   },
  { v: "entrepreneurial_community", l: "Comunidad Emprendedora"  },
  { v: "other",                     l: "Otro / Other"              },
];
const INVEST_OPTS = [
  { v: "fintech",    l: "Fintech"                      }, { v: "edtech",     l: "Edtech"        },
  { v: "healthtech", l: "Healthtech"                   }, { v: "agritech",   l: "Agritech"      },
  { v: "ecommerce",  l: "E-Commerce"                  }, { v: "saas",       l: "SaaS / B2B"   },
  { v: "cleantech",  l: "Cleantech"                   }, { v: "multi",      l: "Multi-sector / Diversificado" },
  { v: "other",      l: "Otro / Other"                },
];

// ─── Shared inline styles ─────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  fontFamily: F_LIGHT, fontSize: "14px", color: C_TEXT,
  background: "transparent", border: "none",
  borderBottom: `1px solid ${C_MUTED}`,
  padding: "9px 0 6px", outline: "none", width: "100%",
};
const selectStyle: React.CSSProperties = {
  ...inputStyle,
  color: C_MUTED,
  WebkitAppearance: "none", MozAppearance: "none" as never, cursor: "pointer",
  backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23999'/%3E%3C/svg%3E\")",
  backgroundRepeat: "no-repeat", backgroundPosition: "right 2px center", backgroundSize: "10px 6px",
  backgroundColor: "transparent",
};
const submitStyle: React.CSSProperties = {
  width: "100%", background: C_PURPLE, border: `1px solid ${C_PURPLE}`,
  padding: "12px 0", fontFamily: F_LIGHT, fontSize: "16px",
  color: C_WHITE, cursor: "pointer", letterSpacing: ".02em",
};

// ─── Shared components ────────────────────────────────────────────────────────

function Field({ children }: { children: React.ReactNode }) {
  return <div style={{ marginBottom: "4px" }}>{children}</div>;
}

function CbRow({ id, label }: { id: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "7px", margin: "12px 0 12px" }}>
      <input type="checkbox" id={id}
        style={{ marginTop: "3px", width: "13px", height: "13px", flexShrink: 0, accentColor: C_PURPLE, cursor: "pointer" }} />
      <label htmlFor={id}
        style={{ fontFamily: F_LIGHT, fontSize: "13px", color: C_TEXT, lineHeight: "1.5", cursor: "pointer" }}>
        {label}
      </label>
    </div>
  );
}

function ErrMsg({ msg }: { msg: string }) {
  return <p style={{ fontFamily: F_LIGHT, fontSize: "12px", color: "#cc0000", margin: "6px 0" }}>{msg}</p>;
}

function SuccessBox({ isEs }: { isEs: boolean }) {
  return (
    <div style={{ background: "#f4f0fa", border: "1px solid #c5b6f0", padding: "20px", textAlign: "center", marginTop: "6px" }}>
      <p style={{ fontFamily: F_HEAVY, fontSize: "15px", color: "#5b4d9e", marginBottom: "6px" }}>
        {isEs ? "¡Solicitud Recibida!" : "Application Received!"}
      </p>
      <p style={{ fontFamily: F_LIGHT, fontSize: "13px", color: "#7b6aaa", lineHeight: "1.6" }}>
        {isEs
          ? "Revisa tu correo para el enlace de activación. Úsalo para crear tu contraseña y acceder a tu portal."
          : "Check your inbox for your activation link. Use it to set your password and access your portal."}
      </p>
    </div>
  );
}

function Resources({ tab, isEs }: { tab: Tab; isEs: boolean }) {
  const items = RESOURCES[tab];
  if (!items.length) return null;
  return (
    <div style={{ marginTop: "24px" }}>
      {/* Boss.Technology bee icon */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="https://static.wixstatic.com/media/e97957_5789a7992ec041d9b220e51e369c1251~mv2.png"
        alt="Boss.Technology"
        width={56} height={56}
        style={{ marginBottom: "14px", display: "block" }}
      />
      {items.map((r, i) => (
        <div key={i} style={{ marginBottom: "14px" }}>
          <span style={{ fontFamily: F_HEAVY, fontSize: "14px", color: C_TEXT }}>
            {isEs ? r.titleEs : r.titleEn}
          </span>
          {" "}
          <a href={r.url} target="_blank" rel="noopener noreferrer"
            style={{ fontFamily: F_LIGHT, fontSize: "14px", color: C_PURPLE, textDecoration: "none" }}>
            | download ▼
          </a>
          <p style={{ fontFamily: F_LIGHT, fontSize: "13px", color: C_TEXT, lineHeight: "1.5", marginTop: "3px" }}>
            {isEs ? r.descEs : r.descEn}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── Form hook ────────────────────────────────────────────────────────────────

function useForm(endpoint: string) {
  const [done,    setDone]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); setError(null);
    const fd = new FormData(e.currentTarget);
    const body: Record<string, string> = {};
    fd.forEach((v, k) => { if (typeof v === "string" && v.trim()) body[k] = v.trim(); });
    try {
      const res  = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok) setError(json.error ?? "Error. Por favor inténtalo de nuevo.");
      else         setDone(true);
    } catch { setError("Error de red. Por favor inténtalo de nuevo."); }
    finally  { setLoading(false); }
  }

  return { done, loading, error, submit };
}

// ─── Individual forms ─────────────────────────────────────────────────────────

function GetCredForm({ isEs }: { isEs: boolean }) {
  const { done, loading, error, submit } = useForm("/api/intake/startup");
  if (done) return <SuccessBox isEs={isEs} />;
  return (
    <form onSubmit={submit}>
      <Field><input name="org_name"       required style={inputStyle} placeholder={isEs ? "Nombre de la Startup"         : "Startup Name"}          /></Field>
      <Field><input name="website"                 style={inputStyle} placeholder="Website / URL / Link" type="url"                                 /></Field>
      <Field><input name="contact_person" required style={inputStyle} placeholder={isEs ? "Persona de contacto / Puesto" : "Contact Person / Title"} /></Field>
      <Field><input name="email"          required style={inputStyle} placeholder="e-Mail" type="email"                                              /></Field>
      <Field><input name="phone_whatsapp"          style={inputStyle} placeholder="Whatsapp"                                                          /></Field>
      <Field>
        <select name="industry" required style={selectStyle}>
          <option value="">{isEs ? "Industria Principal" : "Primary Industry"}</option>
          {INDUSTRY_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
      </Field>
      <Field><textarea name="description" style={{ ...inputStyle, resize: "none" }} rows={1} placeholder={isEs ? "Descripción Breve" : "Brief Description"} /></Field>
      <CbRow id="cb-gc" label={isEs
        ? "Agregue nuestra Startup a su lista de contactos y manténganos informados sobre próximas reuniones y eventos."
        : "Add our Startup to your contact list and keep us informed about upcoming meetings and events."} />
      {error && <ErrMsg msg={error} />}
      <button type="submit" disabled={loading} style={submitStyle}>{loading ? "Enviando…" : "Submit"}</button>
    </form>
  );
}

function AcceleratorForm({ isEs }: { isEs: boolean }) {
  const { done, loading, error, submit } = useForm("/api/intake/accelerator");
  if (done) return <SuccessBox isEs={isEs} />;
  return (
    <form onSubmit={submit}>
      <Field><input name="org_name"       required style={inputStyle} placeholder={isEs ? "Nombre del Acelerador"         : "Accelerator Name"}          /></Field>
      <Field><input name="website"                 style={inputStyle} placeholder="Website / URL / LinkedIn" type="url"                                  /></Field>
      <Field><input name="contact_person" required style={inputStyle} placeholder={isEs ? "Persona de Contacto / Cargo"   : "Contact Person / Position"}  /></Field>
      <Field><input name="email"          required style={inputStyle} placeholder="e-Mail" type="email"                                                   /></Field>
      <Field><input name="phone_whatsapp"          style={inputStyle} placeholder={isEs ? "Phone # / Whatsapp (opcional)" : "Phone # / Whatsapp (optional)"} /></Field>
      <Field>
        <select name="org_type" required style={selectStyle}>
          <option value="">{isEs ? "Tipo de Acelerador" : "Accelerator Type"}</option>
          {ACCEL_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
      </Field>
      <Field><input name="country" style={inputStyle} placeholder={isEs ? "País / Región de Operación" : "Country / Region of Operation"} /></Field>
      <CbRow id="cb-ac" label={isEs
        ? "Agregue nuestro Acelerador a su lista de contactos y manténganos informados sobre las próximas reuniones y eventos."
        : "Add our Accelerator to your contact list and keep us informed about upcoming meetings and events."} />
      {error && <ErrMsg msg={error} />}
      <button type="submit" disabled={loading} style={submitStyle}>{loading ? "Enviando…" : "Submit"}</button>
    </form>
  );
}

function EvaluatorForm({ isEs }: { isEs: boolean }) {
  const { done, loading, error, submit } = useForm("/api/intake/evaluator");
  if (done) return <SuccessBox isEs={isEs} />;
  return (
    <form onSubmit={submit}>
      <Field><input name="org_name"       required style={inputStyle} placeholder={isEs ? "Nombre del Grupo / Organización" : "Group / Organization Name"}    /></Field>
      <Field><input name="website"                 style={inputStyle} placeholder="Website / URL / LinkedIn" type="url"                                        /></Field>
      <Field><input name="contact_person" required style={inputStyle} placeholder={isEs ? "Persona de Contacto / Cargo"     : "Contact Person / Position"}     /></Field>
      <Field><input name="email"          required style={inputStyle} placeholder="e-Mail" type="email"                                                         /></Field>
      <Field><input name="phone_whatsapp"          style={inputStyle} placeholder={isEs ? "Phone # / Whatsapp (opcional)"   : "Phone # / Whatsapp (optional)"} /></Field>
      <Field>
        <select name="org_type" required style={selectStyle}>
          <option value="">{isEs ? "Tipo de Organización" : "Organization Type"}</option>
          {EVAL_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
      </Field>
      <Field><input name="country" style={inputStyle} placeholder={isEs ? "Países / Regiones en los que Opera" : "Countries / Regions of Operation"} /></Field>
      <CbRow id="cb-ev" label={isEs
        ? "Agregue nuestro Grupo/Organización a su lista de contactos y manténganos informados sobre las próximas reuniones y eventos."
        : "Add our Group/Organization to your contact list and keep us informed about upcoming meetings and events."} />
      {error && <ErrMsg msg={error} />}
      <button type="submit" disabled={loading} style={submitStyle}>{loading ? "Enviando…" : "Submit"}</button>
    </form>
  );
}

function InvestorForm({ isEs }: { isEs: boolean }) {
  const { done, loading, error, submit } = useForm("/api/intake/investor");
  if (done) return <SuccessBox isEs={isEs} />;
  return (
    <form onSubmit={submit}>
      <Field><input name="org_name"       required style={inputStyle} placeholder={isEs ? "Grupo de Inversión / Fondo"    : "Investment Group / Fund"}          /></Field>
      <Field><input name="website"                 style={inputStyle} placeholder="Website / URL / LinkedIn" type="url"                                          /></Field>
      <Field><input name="contact_person" required style={inputStyle} placeholder={isEs ? "Persona de contacto / Cargo"   : "Contact Person / Position"}         /></Field>
      <Field><input name="email"          required style={inputStyle} placeholder="e-Mail" type="email"                                                            /></Field>
      <Field><input name="phone_whatsapp"          style={inputStyle} placeholder={isEs ? "Phone # / Whatsapp (opcional)" : "Phone # / Whatsapp (optional)"}     /></Field>
      <Field>
        <select name="investment_focus" required style={selectStyle}>
          <option value="">{isEs ? "Enfoque de inversión o área de interés" : "Investment Focus or Interest"}</option>
          {INVEST_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
      </Field>
      <Field><input name="country" style={inputStyle} placeholder={isEs ? "Países / regiones en los que invierte" : "Countries / regions where you invest"} /></Field>
      <CbRow id="cb-inv" label={isEs
        ? "Agregue nuestro Grupo/Fondo de Inversión a su lista de contactos y manténganos informados sobre nuestras próximas reuniones y eventos."
        : "Add our Investment Group/Fund to your contact list and keep us informed about upcoming meetings and events."} />
      {error && <ErrMsg msg={error} />}
      <button type="submit" disabled={loading} style={submitStyle}>{loading ? "Enviando…" : "Submit"}</button>
    </form>
  );
}

function CredListPane({ credList, locale }: { credList: CredListRow[]; locale: Locale }) {
  const [q, setQ] = useState("");
  const isEs = locale === "es";
  const filtered = q.trim()
    ? credList.filter(r =>
        r.startups?.org_name.toLowerCase().includes(q.toLowerCase()) ||
        r.unique_code.toLowerCase().includes(q.toLowerCase()))
    : credList;

  return (
    <div>
      <input
        value={q} onChange={e => setQ(e.target.value)}
        style={{ ...inputStyle, marginBottom: "16px" }}
        placeholder={isEs ? "Buscar startup o ID de credencial…" : "Search startup or credential ID…"}
      />
      {filtered.length === 0 ? (
        <p style={{ fontFamily: F_LIGHT, fontSize: "13px", color: C_MUTED, fontStyle: "italic" }}>
          {isEs ? "No se encontraron startups acreditados." : "No accredited startups found."}
        </p>
      ) : (
        <div style={{ border: `1px solid ${C_MUTED}` }}>
          {filtered.map(row => (
            <div key={row.unique_code} style={{ display: "grid", gridTemplateColumns: "1fr 90px 110px", padding: "10px 14px", borderBottom: "1px solid #f0f0f0", alignItems: "center" }}>
              <span style={{ fontFamily: F_HEAVY, fontSize: "14px", color: C_TEXT }}>
                {row.startups?.org_name ?? "—"}
                {row.startups?.country && (
                  <span style={{ fontFamily: F_LIGHT, fontSize: "12px", color: C_MUTED, marginLeft: "6px" }}>
                    {row.startups.country}
                  </span>
                )}
              </span>
              <span style={{ fontFamily: F_LIGHT, fontSize: "12px", color: C_MUTED }}>{row.startups?.industry ?? "—"}</span>
              <Link href={`/startup/${row.unique_code}`} style={{ fontFamily: F_LIGHT, fontSize: "12px", color: C_PURPLE, textDecoration: "underline" }}>
                {row.unique_code.toUpperCase()}
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function HomepageHub({ locale, credList, initialTab = "getcred" }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [langOpen, setLangOpen]   = useState(false);
  const langRef                   = useRef<HTMLDivElement>(null);
  const isEs = locale === "es";
  const otherLocale = isEs ? "en" : "es";

  // Close language dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const row1Tabs: Tab[] = ["getcred", "accelerators"];
  const row2Tabs: Tab[] = ["evaluators", "investors", "cred-list"];

  function tabLabel(id: Tab) {
    const t = TABS.find(x => x.id === id);
    return isEs ? t?.es : t?.en;
  }

  const tabBtnStyle = (id: Tab): React.CSSProperties => ({
    fontFamily: F_HEAVY,
    fontSize: "28px",
    color: activeTab === id ? C_TEXT : C_MUTED,
    background: "none",
    border: "none",
    padding: 0,
    cursor: "pointer",
    lineHeight: "1.4",
    letterSpacing: "-.01em",
    transition: "color .12s",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>

      {/* ── FULL-WIDTH HEADER ── sticky so it stays visible when scrolling to footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 48px", height: "64px", background: C_WHITE, borderBottom: `1px solid #e8e8e8`, position: "sticky", top: 0, zIndex: 10 }}>
        {/* Logo */}
        <Link href={`/${locale}`}>
          <Image
            src="/logo.png"
            alt="StartupBoss.org"
            width={220}
            height={40}
            style={{ objectFit: "contain", objectPosition: "left center", display: "block" }}
            priority
          />
        </Link>

        {/* Right side: language dropdown + Sign In */}
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>

          {/* Language dropdown */}
          <div ref={langRef} style={{ position: "relative" }}>
            <button
              onClick={() => setLangOpen(o => !o)}
              style={{ fontFamily: F_LIGHT, fontSize: "13px", color: C_MUTED, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px", padding: 0 }}
            >
              {isEs ? "ES" : "EN"}
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ transition: "transform .15s", transform: langOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {langOpen && (
              <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, background: C_WHITE, border: "1px solid #e8e8e8", minWidth: "72px", boxShadow: "0 4px 12px rgba(0,0,0,.08)", zIndex: 50 }}>
                <Link
                  href={`/${locale}`}
                  onClick={() => setLangOpen(false)}
                  style={{ display: "block", padding: "8px 14px", fontFamily: F_LIGHT, fontSize: "13px", color: !isEs ? C_TEXT : C_MUTED, background: !isEs ? "#f5f5f5" : "transparent", textDecoration: "none" }}
                >
                  EN
                </Link>
                <Link
                  href={`/${otherLocale}`}
                  onClick={() => setLangOpen(false)}
                  style={{ display: "block", padding: "8px 14px", fontFamily: F_LIGHT, fontSize: "13px", color: isEs ? C_TEXT : C_MUTED, background: isEs ? "#f5f5f5" : "transparent", textDecoration: "none" }}
                >
                  ES
                </Link>
              </div>
            )}
          </div>

          {/* Sign In */}
          <Link href={`/${locale}/login`}
            style={{ fontFamily: F_LIGHT, fontSize: "13px", color: C_MUTED, textDecoration: "underline", whiteSpace: "nowrap" }}>
            {isEs ? "Iniciar Sesión" : "Sign In"}
          </Link>
        </div>
      </div>

      {/* ── SPLIT ROW ── fills viewport below header; footer revealed on scroll */}
      <div style={{ display: "flex", height: "calc(100vh - 64px)", overflow: "hidden", flexShrink: 0 }}>

        {/* LEFT PANEL — 50% viewport, white — scrolls internally */}
        <div style={{ width: "50%", flexShrink: 0, background: C_WHITE, padding: "20px 48px 32px", display: "flex", flexDirection: "column", overflowY: "auto", fontFamily: F_LIGHT }}>

          {/* Tab navigation — 2 rows */}
          <div style={{ display: "flex", alignItems: "baseline", gap: "22px", marginBottom: "2px" }}>
            {row1Tabs.map(id => (
              <button key={id} onClick={() => setActiveTab(id)} style={tabBtnStyle(id)}>
                {tabLabel(id)}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "22px" }}>
            {row2Tabs.map(id => (
              <button key={id} onClick={() => setActiveTab(id)} style={tabBtnStyle(id)}>
                {tabLabel(id)}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div style={{ width: "100%", height: "1px", background: C_TEXT, margin: "10px 0 18px" }} />

          {/* Subtitle */}
          <p style={{ fontFamily: F_LIGHT, fontSize: "17px", color: C_PURPLE, marginBottom: "14px" }}>
            {isEs ? SUBTITLES[activeTab].es : SUBTITLES[activeTab].en}
          </p>

          {/* Active form */}
          {activeTab === "getcred"      && <GetCredForm    isEs={isEs} />}
          {activeTab === "accelerators" && <AcceleratorForm isEs={isEs} />}
          {activeTab === "evaluators"   && <EvaluatorForm   isEs={isEs} />}
          {activeTab === "investors"    && <InvestorForm    isEs={isEs} />}
          {activeTab === "cred-list"   && <CredListPane    credList={credList} locale={locale} />}

          {/* Resources below each form */}
          <Resources tab={activeTab} isEs={isEs} />

        </div>

        {/* RIGHT PANEL — lavender + NEED CRED? image + black bottom bar */}
        <div style={{ flex: 1, background: "#c4b5f0", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Dev team: download the NEED CRED? image, save to /public/need-cred.jpg, use Next.js Image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://static.wixstatic.com/media/e97957_f5abe2dc670d41e480a991e1ac3e4931~mv2.jpg"
            alt="NEED CRED? — StartupBoss.org"
            style={{ width: "100%", flex: 1, minHeight: 0, objectFit: "cover", objectPosition: "50% 30%", display: "block" }}
          />
          {/* Black bar at bottom of right panel (visible in PDF) */}
          <div style={{ background: C_BLK, height: "52px", width: "100%", flexShrink: 0 }} />
        </div>
      </div>

      {/* ── FULL-WIDTH FOOTER ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 60px", borderTop: "1px solid #e8e8e8", background: C_WHITE, flexShrink: 0 }}>
        {/* Sponsored by Boss.Technology */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <span style={{ fontFamily: F_LIGHT, fontSize: "13px", color: C_TEXT, whiteSpace: "nowrap" }}>
            {isEs ? "Patrocinado por" : "Sponsored by"}
          </span>
          <div style={{ width: "40px", height: "1px", background: C_TEXT, flexShrink: 0 }} />
          <a href="https://boss.technology" target="_blank" rel="noopener noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://static.wixstatic.com/media/e97957_e68f6e974b44435683e29d1f478057e1~mv2.png"
              alt="Boss.Technology"
              style={{ height: "38px", width: "auto", maxWidth: "220px", display: "block", objectFit: "contain" }}
            />
          </a>
        </div>

        {/* Powered by New Relic */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <span style={{ fontFamily: F_LIGHT, fontSize: "13px", color: C_TEXT, whiteSpace: "nowrap" }}>
            {isEs ? "Con el poder de" : "Powered by"}
          </span>
          <div style={{ width: "40px", height: "1px", background: C_TEXT, flexShrink: 0 }} />
          <a href="https://newrelic.com/solutions/industry/startups" target="_blank" rel="noopener noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://static.wixstatic.com/media/e97957_42d4d4509e0846d7bf96db5a50fd77dc~mv2.png"
              alt="New Relic"
              style={{ height: "26px", width: "auto", maxWidth: "160px", display: "block", objectFit: "contain" }}
            />
          </a>
        </div>
      </div>

      {/* Copyright */}
      <div style={{ textAlign: "center", padding: "9px 40px 10px", background: "#555555", flexShrink: 0 }}>
        <p style={{ fontFamily: F_LIGHT, fontSize: "12px", color: "#d8d8d8" }}>
          © 2025 Boss.Technology SAC | Powered by ❤ 🇵🇪 🇨🇴
        </p>
      </div>
    </div>
  );
}
