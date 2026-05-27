"use client";

import { useState }    from "react";
import Link            from "next/link";
import { useParams }   from "next/navigation";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import type { Locale }  from "@/lib/i18n/types";

const INDUSTRY_OPTIONS = [
  { value: "fintech",    label: "Fintech"        },
  { value: "edtech",     label: "Edtech"         },
  { value: "healthtech", label: "Healthtech"     },
  { value: "agritech",   label: "Agritech"       },
  { value: "ecommerce",  label: "E-Commerce"     },
  { value: "saas",       label: "SaaS / B2B"     },
  { value: "cleantech",  label: "Cleantech"      },
  { value: "logistics",  label: "Logistics"      },
  { value: "other",      label: "Other"          },
];

const STAGE_OPTIONS = [
  { value: "idea",           label: "Idea / Pre-MVP"  },
  { value: "mvp",            label: "MVP"             },
  { value: "early_traction", label: "Early Traction"  },
  { value: "growth",         label: "Growth"          },
  { value: "scale",          label: "Scale"           },
];

// Dict nav labels are static here since this is a client component;
// locale-specific text is minimal on this page.
const NAV_DICT = {
  nav: {
    home:       "Home",
    howItWorks: "How It Works",
    credList:   "CRED List",
    login:      "Sign In",
    signup:     "Get Started",
  },
};

export default function GetCredPage() {
  const params  = useParams<{ locale: string }>();
  const locale  = (params.locale ?? "en") as Locale;

  const [step,    setStep]    = useState<"form" | "success">("form");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const body: Record<string, string> = {};
    formData.forEach((val, key) => {
      if (typeof val === "string" && val.trim()) body[key] = val.trim();
    });

    try {
      const res = await fetch("/api/intake/startup", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Something went wrong.");
      } else {
        setStep("success");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (step === "success") {
    return (
      <>
        <MarketingNav locale={locale} dict={NAV_DICT} />
        <div className="min-h-[80vh] flex items-center justify-center px-4">
          <div className="max-w-[480px] w-full text-center">
            <div className="w-10 h-10 bg-sb-default mx-auto mb-6" />
            <h1 className="text-2xl font-bold tracking-tight mb-3">
              Application Received
            </h1>
            <p className="text-sm text-cs-500 leading-relaxed mb-6">
              Check your inbox for an activation link. Click it to set up
              your password and access your startup dashboard.
            </p>
            <Link
              href={`/${locale}`}
              className="text-[8px] font-mono text-cs-400 uppercase tracking-widest hover:text-black transition-colors"
            >
              ← Back to home
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <MarketingNav locale={locale} dict={NAV_DICT} />

      {/* Black accent strip */}
      <div className="bg-black px-7 py-1">
        <span className="text-[7px] font-mono text-sb-default uppercase tracking-widest">
          GetCRED · Build Trust · Become Unstoppable
        </span>
      </div>

      <div className="max-w-[720px] mx-auto px-7 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-3 h-3 bg-sb-default" />
            <span className="text-[8px] font-mono text-sb-text uppercase tracking-widest font-semibold">
              Accreditation Application
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Apply for Accreditation
          </h1>
          <p className="text-sm text-cs-500 leading-relaxed max-w-[480px]">
            Submit your startup for the CRED process. An expert evaluator
            will assess your startup against the CHASS1S framework.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-8">

          {/* Section 01 */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[8px] font-mono text-cs-400 uppercase tracking-widest border-b border-cs-200 pb-1 w-full">
                01 — Startup Information
              </span>
            </div>
            <div className="border border-cs-200 bg-white p-5 flex flex-col gap-4">
              <div>
                <label className="cs-label">Organization Name *</label>
                <input name="org_name" type="text" required placeholder="Acme Inc." className="cs-input" />
              </div>
              <div>
                <label className="cs-label">Email Address *</label>
                <input name="email" type="email" required placeholder="you@startup.com" className="cs-input" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="cs-label">Industry</label>
                  <select name="industry" className="cs-input">
                    <option value="">Select industry…</option>
                    {INDUSTRY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="cs-label">Stage</label>
                  <select name="stage" className="cs-input">
                    <option value="">Select stage…</option>
                    {STAGE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="cs-label">Website</label>
                  <input name="website" type="url" placeholder="https://yourstartup.com" className="cs-input" />
                </div>
                <div>
                  <label className="cs-label">Country</label>
                  <input name="country" type="text" placeholder="Peru" className="cs-input" />
                </div>
              </div>
              <div>
                <label className="cs-label">Team Size</label>
                <input name="team_size" type="number" min={1} placeholder="5" className="cs-input w-32" />
              </div>
            </div>
          </div>

          {/* Section 02 */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[8px] font-mono text-cs-400 uppercase tracking-widest border-b border-cs-200 pb-1 w-full">
                02 — About Your Startup
              </span>
            </div>
            <div className="border border-cs-200 bg-white p-5 flex flex-col gap-4">
              <div>
                <label className="cs-label">What does your startup do? *</label>
                <textarea
                  name="description"
                  required
                  placeholder="Describe your product, market, and traction…"
                  rows={3}
                  className="cs-input resize-none"
                />
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="border border-red-300 bg-red-50 px-4 py-3 text-[8px] font-mono text-red-700">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-4">
            <button type="submit" disabled={loading} className="btn-primary btn-lg">
              {loading ? "Submitting…" : "Submit Application"}
            </button>
            <Link
              href={`/${locale}`}
              className="text-[8px] font-mono text-cs-400 uppercase tracking-widest hover:text-black transition-colors"
            >
              Cancel
            </Link>
          </div>

        </form>
      </div>
    </>
  );
}
