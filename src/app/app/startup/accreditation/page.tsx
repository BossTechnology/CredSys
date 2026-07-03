import { createClient }          from "@/lib/supabase/server";
import { createServiceClient }   from "@/lib/supabase/service";
import { redirect }              from "next/navigation";
import Link                      from "next/link";
import { Badge }                 from "@/components/ui/Badge";
import { WorkflowStatusBar }     from "@/components/ui/WorkflowStatusBar";
import { VerificationPanel }     from "@/components/accreditation/VerificationPanel";
import { submitAccreditationRequest } from "@/app/actions/apply";
import { getAppDictionary }      from "@/lib/i18n/loader";
import { SubmitButton }          from "@/components/admin/SubmitButton";
import type { AccreditationStatus, BLIPSData, ADDISData } from "@/lib/supabase/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const INDUSTRY_OPTIONS = [
  { value: "fintech",    label: "Fintech"     },
  { value: "edtech",     label: "Edtech"      },
  { value: "healthtech", label: "Healthtech"  },
  { value: "agritech",   label: "Agritech"    },
  { value: "ecommerce",  label: "E-Commerce"  },
  { value: "saas",       label: "SaaS / B2B"  },
  { value: "cleantech",  label: "Cleantech"   },
  { value: "logistics",  label: "Logistics"   },
  { value: "other",      label: "Other"       },
];

const STAGE_OPTIONS = [
  { value: "idea",           label: "Idea / Pre-MVP" },
  { value: "mvp",            label: "MVP"            },
  { value: "early_traction", label: "Early Traction" },
  { value: "growth",         label: "Growth"         },
  { value: "scale",          label: "Scale"          },
];

const TERMINAL: AccreditationStatus[] = ["accredited", "rejected", "expired"];

function fmt(iso: string | null | undefined, locale = "en") {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(locale, {
    month: "long", day: "numeric", year: "numeric",
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function StartupAccreditationPage() {
  const { locale, dict } = await getAppDictionary();
  const t = dict.startupAccred;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/en/login");

  const service = createServiceClient();

  const { data: profile } = await service
    .from("user_profiles")
    .select("entity_id")
    .eq("user_id", user.id)
    .single();

  if (!profile?.entity_id) redirect("/en/login");

  const { data: startup } = await service
    .from("startups")
    .select("org_name, email, industry, stage, country, website, description, team_size")
    .eq("id", profile.entity_id)
    .single();

  // Most recent request
  const { data: request } = await service
    .from("accreditation_requests")
    .select("*")
    .eq("startup_id", profile.entity_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const status   = request?.status as AccreditationStatus | undefined;
  const terminal = status ? TERMINAL.includes(status) : false;
  const hasActive = !!request && !terminal;

  // ── No request yet — show application form ────────────────────────────────
  if (!request) {
    return (
      <div className="max-w-[720px] mx-auto px-4 sm:px-7 py-8">
        <div className="mb-8">
          <Link
            href="/app/startup/dashboard"
            className="text-[12px] font-mono text-cs-400 uppercase tracking-widest hover:text-black transition-colors block mb-6"
          >
            ← {t.backDashboard}
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 bg-sb-default" />
            <span className="text-[13px] font-mono text-cs-400 uppercase tracking-widest">
              {t.applyHeading}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{t.requestTitle}</h1>
          <p className="text-sm text-cs-500 mt-1 leading-relaxed">
            {t.requestSubtitle}
          </p>
        </div>

        <form action={submitAccreditationRequest} className="flex flex-col gap-6">

          <div className="border border-cs-200 bg-white">
            <div className="px-5 py-2 border-b border-cs-200 bg-cs-50">
              <span className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
                {t.section01}
              </span>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div>
                <label className="cs-label">{t.startupName}</label>
                <input
                  name="startup_name"
                  type="text"
                  required
                  defaultValue={startup?.org_name ?? ""}
                  className="cs-input"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="cs-label">{t.industryReq}</label>
                  <select name="industry" defaultValue={startup?.industry ?? ""} className="cs-input" required>
                    <option value="">Select…</option>
                    {INDUSTRY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="cs-label">{t.stage}</label>
                  <select name="stage" defaultValue={startup?.stage ?? ""} className="cs-input">
                    <option value="">Select…</option>
                    {STAGE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="cs-label">{t.website}</label>
                  <input name="website" type="text" defaultValue={startup?.website ?? ""} placeholder={t.websitePH} className="cs-input" />
                </div>
                <div>
                  <label className="cs-label">{t.country}</label>
                  <input name="country" type="text" defaultValue={startup?.country ?? ""} placeholder={t.countryPH} className="cs-input" />
                </div>
              </div>
              <div>
                <label className="cs-label">{t.teamSize}</label>
                <input name="team_size" type="number" min={1} defaultValue={startup?.team_size ?? ""} className="cs-input w-28" />
              </div>
            </div>
          </div>

          <div className="border border-cs-200 bg-white">
            <div className="px-5 py-2 border-b border-cs-200 bg-cs-50">
              <span className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
                {t.section02}
              </span>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div>
                <label className="cs-label">{t.whatDoes}</label>
                <textarea name="description" required rows={3} defaultValue={startup?.description ?? ""} placeholder={t.whatDoesPH} className="cs-input resize-none" />
              </div>
              <div>
                <label className="cs-label">{t.problem}</label>
                <textarea name="problem" rows={2} placeholder={t.problemPH} className="cs-input resize-none" />
              </div>
              <div>
                <label className="cs-label">{t.traction}</label>
                <textarea name="traction" rows={2} placeholder={t.tractionPH} className="cs-input resize-none" />
              </div>
            </div>
          </div>

          <div className="border border-cs-200 bg-white">
            <div className="px-5 py-2 border-b border-cs-200 bg-cs-50">
              <span className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
                {t.section03}
              </span>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div>
                <label className="cs-label">{t.demoUrl}</label>
                <input name="demo_url" type="text" placeholder={t.demoPH} className="cs-input" />
              </div>
              <div>
                <label className="cs-label">{t.pitchDeck}</label>
                <input name="pitch_deck_url" type="text" placeholder={t.pitchDeckPH} className="cs-input" />
              </div>
              <div>
                <label className="cs-label">{t.additionalNotes}</label>
                <textarea name="additional_notes" rows={2} placeholder={t.additionalNotesPH} className="cs-input resize-none" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <SubmitButton label={t.submit} className="btn-primary btn-lg" />
            <Link href="/app/startup/dashboard" className="btn-ghost btn-lg">
              {t.cancelLink}
            </Link>
          </div>

        </form>
      </div>
    );
  }

  // ── Has a request — show status + BLIPS/ADDIS read-only ───────────────────

  // Credential
  let credCode: string | null = null;
  if (status === "accredited") {
    const { data: credPage } = await service
      .from("cred_pages")
      .select("unique_code")
      .eq("accreditation_request_id", request.id)
      .maybeSingle();
    credCode = credPage?.unique_code ?? null;
  }

  return (
    <div className="max-w-[860px] mx-auto px-4 sm:px-7 py-8">

      <Link
        href="/app/startup/dashboard"
        className="text-[12px] font-mono text-cs-400 uppercase tracking-widest hover:text-black transition-colors block mb-6"
      >
        ← {t.backDashboard}
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="text-[13px] font-mono text-cs-400 uppercase tracking-widest mb-1">
            {t.requestTitle}
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{request.startup_name}</h1>
          <p className="text-[13px] font-mono text-cs-400 mt-1">
            {t.submitted} {fmt(request.created_at, locale)}
          </p>
        </div>
        <Badge variant={status!} />
      </div>

      {/* Workflow progress */}
      {!terminal && (
        <div className="mb-6">
          <WorkflowStatusBar currentStatus={status!} />
        </div>
      )}

      {/* Accredited banner */}
      {status === "accredited" && credCode && (
        <div className="bg-sb-light border border-sb-default px-5 py-4 mb-6 flex items-center justify-between">
          <div>
            <div className="text-[12px] font-mono text-sb-text uppercase tracking-widest mb-0.5">
              {t.credentialId}
            </div>
            <div className="text-lg font-bold font-mono tracking-widest">
              {credCode.toUpperCase()}
            </div>
            <div className="text-[12px] font-mono text-cs-400 mt-0.5">
              {t.accredited} {fmt(request.accredited_at, locale)}
              {request.expires_at && ` · ${t.expires} ${fmt(request.expires_at, locale)}`}
            </div>
          </div>
          <Link href={`/startup/${credCode}`} target="_blank" className="btn-accent btn-sm">
            {t.viewPublicCredential} →
          </Link>
        </div>
      )}

      {/* Evaluator notes */}
      {request.evaluator_notes && (
        <div className="border border-cs-200 bg-cs-50 px-5 py-3 mb-6">
          <div className="text-[12px] font-mono text-cs-400 uppercase tracking-widest mb-1">
            {t.evaluatorNotes}
          </div>
          <p className="text-[13px] text-cs-700 leading-relaxed">{request.evaluator_notes}</p>
        </div>
      )}

      {/* BLIPS / ADDIS — read-only view */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[12px] font-mono text-cs-400 uppercase tracking-widest border-b border-cs-200 pb-1 flex-1">
            {t.verificationProgress}
          </span>
        </div>
        <VerificationPanel
          requestId={request.id}
          initialBLIPS={(request as unknown as { blips_data?: BLIPSData | null }).blips_data ?? null}
          initialADDIS={(request as unknown as { addis_data?: ADDISData | null }).addis_data ?? null}
          initialNotes={request.evaluator_notes}
          readOnly
        />
      </div>

      {/* Snapshot */}
      <div className="border border-cs-200 bg-white">
        <div className="px-5 py-2 border-b border-cs-200 bg-cs-50">
          <span className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
            {t.submissionSnapshot}
          </span>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
          {[
            { label: t.industry,       value: request.industry  },
            { label: t.stageLabel,     value: request.stage     },
            { label: t.countryLabel,   value: request.country   },
            { label: t.teamSizeLabel,  value: request.team_size },
          ].map((f) => (
            <div key={f.label}>
              <div className="text-[12px] font-mono text-cs-400 uppercase tracking-widest mb-0.5">
                {f.label}
              </div>
              <div className="text-[13px] font-semibold">{f.value ? String(f.value) : "—"}</div>
            </div>
          ))}
          {request.description && (
            <div className="col-span-2">
              <div className="text-[12px] font-mono text-cs-400 uppercase tracking-widest mb-0.5">{t.descriptionLabel}</div>
              <p className="text-[13px] text-cs-600 leading-relaxed">{request.description}</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
