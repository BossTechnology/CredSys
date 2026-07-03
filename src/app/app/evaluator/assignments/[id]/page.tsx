import { createClient }        from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect, notFound }  from "next/navigation";
import Link                    from "next/link";
import { Badge }               from "@/components/ui/Badge";
import { WorkflowStatusBar }   from "@/components/ui/WorkflowStatusBar";
import { VerificationPanel }   from "@/components/accreditation/VerificationPanel";
import { advanceAccreditationStatus, revertAccreditationStatus } from "@/app/actions/accreditation";
import { rejectWithReason, acceptAssignment, declineAssignment } from "@/app/actions/verification";
import { getAppDictionary }    from "@/lib/i18n/loader";
import { RevertStatusButton }  from "@/components/ui/RevertStatusButton";
import { ACCREDITATION_STATUS_ORDER, type AccreditationStatus, type BLIPSData, type ADDISData } from "@/lib/supabase/types";

// ─── Workflow map ─────────────────────────────────────────────────────────────

const NEXT_STATUS: Partial<Record<AccreditationStatus, AccreditationStatus>> = {
  evaluator_assigned:         "meeting_scheduled",
  meeting_scheduled:          "chass1s_shared",
  chass1s_shared:             "implementation_in_progress",
  implementation_in_progress: "ready_for_verification",
  ready_for_verification:     "verification_in_progress",
  verification_in_progress:   "accredited",
};

const TERMINAL: AccreditationStatus[] = ["accredited", "rejected", "expired"];

function actionLabelFor(
  status: AccreditationStatus,
  t: {
    actionConfirmMeeting: string; actionConfirmChass1s: string;
    actionMarkImplementation: string; actionMarkReady: string;
    actionBeginVerification: string; actionApproveAccredit: string;
  }
): string | undefined {
  const labels: Partial<Record<AccreditationStatus, string>> = {
    evaluator_assigned:         t.actionConfirmMeeting,
    meeting_scheduled:          t.actionConfirmChass1s,
    chass1s_shared:             t.actionMarkImplementation,
    implementation_in_progress: t.actionMarkReady,
    ready_for_verification:     t.actionBeginVerification,
    verification_in_progress:   t.actionApproveAccredit,
  };
  return labels[status];
}

// Form action wrapper — strips the { error } return so <form action> is happy
async function rejectAction(fd: FormData) {
  "use server";
  await rejectWithReason(fd);
}

async function acceptAction(fd: FormData) {
  "use server";
  await acceptAssignment(fd);
}

async function declineAction(fd: FormData) {
  "use server";
  await declineAssignment(fd);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(iso: string | null | undefined, locale = "en") {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(locale, {
    month: "long", day: "numeric", year: "numeric",
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AssignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/en/login");

  const service = createServiceClient();
  const { locale, dict } = await getAppDictionary();
  const t = dict.evalAssignDetail;

  // Resolve evaluator entity_id
  const { data: profile } = await service
    .from("user_profiles")
    .select("entity_id")
    .eq("user_id", user.id)
    .single();

  if (!profile?.entity_id) redirect("/en/login");

  // Fetch the request — enforce ownership
  const { data: req } = await service
    .from("accreditation_requests")
    .select("*")
    .eq("id", id)
    .eq("evaluator_id", profile.entity_id)
    .single();

  if (!req) notFound();

  const status     = req.status as AccreditationStatus;
  const nextStatus = NEXT_STATUS[status];
  const actionLabel= actionLabelFor(status, t);
  const isTerminal = TERMINAL.includes(status);
  const statusIdx  = ACCREDITATION_STATUS_ORDER.indexOf(status);
  const canRevert  = statusIdx > 1 && statusIdx < ACCREDITATION_STATUS_ORDER.length - 1;
  const acceptancePending =
    status === "evaluator_assigned" &&
    (req as unknown as { acceptance_status?: string }).acceptance_status === "pending";

  // Fetch related sponsorship
  const { data: sponsorship } = await service
    .from("accreditation_sponsorships")
    .select("id, sponsor_type, billing_contact_name, billing_contact_email, billing_contact_phone, billing_contact_address, investors(org_name), accelerators(org_name)")
    .eq("accreditation_request_id", id)
    .maybeSingle();

  // Fetch cred_page for accredited requests
  let credCode: string | null = null;
  if (status === "accredited") {
    const { data: credPage } = await service
      .from("cred_pages")
      .select("unique_code")
      .eq("accreditation_request_id", id)
      .maybeSingle();
    credCode = credPage?.unique_code ?? null;
  }

  return (
    <div className="max-w-[860px] mx-auto px-4 sm:px-7 py-8">

      {/* Back */}
      <Link
        href="/app/evaluator/dashboard"
        className="text-[12px] font-mono text-cs-400 uppercase tracking-widest hover:text-black transition-colors block mb-6"
      >
        {t.backToDashboard}
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <div className="text-[13px] font-mono text-cs-400 uppercase tracking-widest mb-1">
            {t.assignmentDetail}
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{req.startup_name}</h1>
          <p className="text-[13px] font-mono text-cs-500 mt-1">{req.startup_email}</p>
        </div>
        <Badge variant={status}>{dict.status[status]}</Badge>
      </div>

      {/* Workflow bar */}
      {!isTerminal && (
        <div className="mb-6">
          <WorkflowStatusBar currentStatus={status} />
        </div>
      )}

      {/* Accredited credential banner */}
      {status === "accredited" && credCode && (
        <div className="bg-sb-light border border-sb-default px-5 py-3 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="text-[12px] font-mono text-sb-text uppercase tracking-widest mb-0.5">
              {t.accreditedBanner}
            </div>
            <div className="text-[13px] font-mono font-semibold tracking-widest">
              {credCode.toUpperCase()}
            </div>
          </div>
          <Link
            href={`/startup/${credCode}`}
            target="_blank"
            className="text-[12px] font-mono text-sb-text underline underline-offset-2 hover:opacity-80"
          >
            {t.viewCredential}
          </Link>
        </div>
      )}

      {/* BLIPS / ADDIS verification panel */}
      {(status === "verification_in_progress" ||
        status === "ready_for_verification"    ||
        status === "accredited") && (
        <div className="mb-6">
          <div className="flex items-center mb-3">
            <span className="text-[12px] font-mono text-cs-400 uppercase tracking-widest border-b border-cs-200 pb-1 flex-1">
              {t.blipsAddisVerification}
            </span>
          </div>
          <VerificationPanel
            requestId={req.id}
            initialBLIPS={(req as unknown as { blips_data?: BLIPSData | null }).blips_data ?? null}
            initialADDIS={(req as unknown as { addis_data?: ADDISData | null }).addis_data ?? null}
            initialNotes={req.evaluator_notes}
            readOnly={status !== "verification_in_progress"}
          />
        </div>
      )}

      {/* Sponsored Accreditation Banner */}
      {sponsorship && (() => {
        const inv = sponsorship.investors as unknown as { org_name: string } | null;
        const acc = sponsorship.accelerators as unknown as { org_name: string } | null;
        const sponsorName = inv?.org_name ?? acc?.org_name ?? "Sponsor";
        return (
          <div className="border border-blue-200 bg-blue-50 px-5 py-3 mb-6">
            <div className="text-[12px] font-mono text-blue-600 uppercase tracking-widest mb-2 font-bold">
              {t.sponsoredAccreditation} · {sponsorship.sponsor_type}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-[12px] font-mono">
              <div>
                <span className="text-cs-400 uppercase tracking-widest text-[12px]">{t.sponsor}</span>
                <div className="font-semibold">{sponsorName}</div>
              </div>
              <div>
                <span className="text-cs-400 uppercase tracking-widest text-[12px]">{t.billingContact}</span>
                <div className="font-semibold">{sponsorship.billing_contact_name}</div>
              </div>
              <div>
                <span className="text-cs-400 uppercase tracking-widest text-[12px]">{t.billingEmail}</span>
                <div>{sponsorship.billing_contact_email}</div>
              </div>
              {sponsorship.billing_contact_phone && (
                <div>
                  <span className="text-cs-400 uppercase tracking-widest text-[12px]">{t.phone}</span>
                  <div>{sponsorship.billing_contact_phone}</div>
                </div>
              )}
              {sponsorship.billing_contact_address && (
                <div className="col-span-2">
                  <span className="text-cs-400 uppercase tracking-widest text-[12px]">{t.address}</span>
                  <div>{sponsorship.billing_contact_address}</div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Startup snapshot */}
      <div className="border border-cs-200 bg-white mb-6">
        <div className="px-5 py-2 border-b border-cs-200 bg-cs-50">
          <span className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
            {t.startupProfile}
          </span>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          <div className="col-span-2">
            <div className="text-[12px] font-mono text-cs-400 uppercase tracking-widest mb-0.5">
              {t.contactEmail}
            </div>
            <a
              href={`mailto:${req.startup_email}`}
              className="text-[13px] font-semibold cs-link underline-offset-2 break-all"
            >
              {req.startup_email}
            </a>
          </div>
          {[
            { label: t.industry,   value: req.industry  },
            { label: t.stage,      value: req.stage     },
            { label: t.country,    value: req.country   },
            { label: t.website,    value: req.website   },
            { label: t.teamSize,   value: req.team_size },
            { label: t.submitted,  value: fmt(req.created_at, locale) },
          ].map((f) => (
            <div key={f.label}>
              <div className="text-[12px] font-mono text-cs-400 uppercase tracking-widest mb-0.5">
                {f.label}
              </div>
              <div className="text-[13px] font-semibold">
                {f.value ? String(f.value) : "—"}
              </div>
            </div>
          ))}

          {req.description && (
            <div className="col-span-2">
              <div className="text-[12px] font-mono text-cs-400 uppercase tracking-widest mb-0.5">
                {t.description}
              </div>
              <p className="text-[13px] text-cs-700 leading-relaxed">{req.description}</p>
            </div>
          )}
          {req.problem && (
            <div className="col-span-2">
              <div className="text-[12px] font-mono text-cs-400 uppercase tracking-widest mb-0.5">
                {t.problem}
              </div>
              <p className="text-[13px] text-cs-700 leading-relaxed">{req.problem}</p>
            </div>
          )}
          {req.traction && (
            <div className="col-span-2">
              <div className="text-[12px] font-mono text-cs-400 uppercase tracking-widest mb-0.5">
                {t.traction}
              </div>
              <p className="text-[13px] text-cs-700 leading-relaxed">{req.traction}</p>
            </div>
          )}
          {req.demo_url && (
            <div>
              <div className="text-[12px] font-mono text-cs-400 uppercase tracking-widest mb-0.5">
                {t.demo}
              </div>
              <a href={req.demo_url} target="_blank" rel="noopener noreferrer"
                 className="text-[13px] cs-link underline-offset-2 break-all">
                {req.demo_url}
              </a>
            </div>
          )}
          {req.pitch_deck_url && (
            <div>
              <div className="text-[12px] font-mono text-cs-400 uppercase tracking-widest mb-0.5">
                {t.pitchDeck}
              </div>
              <a href={req.pitch_deck_url} target="_blank" rel="noopener noreferrer"
                 className="text-[13px] cs-link underline-offset-2 break-all">
                {req.pitch_deck_url}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Acceptance gate — evaluator must accept before working the request */}
      {acceptancePending ? (
        <div className="border border-cs-200 bg-white">
          <div className="px-5 py-2 border-b border-cs-200 bg-cs-50">
            <span className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
              {t.acceptTitle}
            </span>
          </div>
          <div className="p-5 flex flex-col gap-4">
            <p className="text-[13px] text-cs-700 leading-relaxed">{t.acceptDesc}</p>

            <form action={acceptAction}>
              <input type="hidden" name="request_id" value={req.id} />
              <button type="submit" className="btn-primary btn-lg">{t.acceptBtn}</button>
            </form>

            <form action={declineAction} className="border-t border-cs-100 pt-4 flex flex-col gap-2">
              <input type="hidden" name="request_id" value={req.id} />
              <label className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
                {t.declineReason}
              </label>
              <div className="flex items-start gap-3">
                <textarea
                  name="decline_reason"
                  rows={2}
                  required
                  placeholder={t.declineReasonPH}
                  className="cs-input resize-none flex-1 text-[12px]"
                />
                <button type="submit" className="btn-danger btn-sm shrink-0 mt-0.5">
                  {t.declineBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : !isTerminal && nextStatus ? (
        <div className="border border-cs-200 bg-white">
          <div className="px-5 py-2 border-b border-cs-200 bg-cs-50">
            <span className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
              {t.evaluatorActions}
            </span>
          </div>
          <div className="p-5 flex flex-col gap-4">

            {/* Advance workflow */}
            <div className="flex items-center gap-4 flex-wrap">
              <form action={advanceAccreditationStatus}>
                <input type="hidden" name="request_id" value={req.id} />
                <input type="hidden" name="next_status" value={nextStatus} />
                <button
                  type="submit"
                  className={nextStatus === "accredited" ? "btn-accent btn-lg" : "btn-primary btn-lg"}
                >
                  {actionLabel}
                </button>
              </form>
              {nextStatus === "accredited" && (
                <span className="text-[12px] font-mono text-cs-400">
                  {t.saveVerificationFirst}
                </span>
              )}
              {canRevert && (
                <RevertStatusButton
                  action={revertAccreditationStatus}
                  requestId={req.id}
                  label={t.stepBack}
                  confirmLabel={t.confirmStepBack}
                />
              )}
            </div>

            {/* Reject with reason */}
            <form action={rejectAction} className="border-t border-cs-100 pt-4 flex flex-col gap-2">
              <input type="hidden" name="request_id" value={req.id} />
              <label className="text-[12px] font-mono text-cs-400 uppercase tracking-widest">
                {t.rejectionReason}
              </label>
              <div className="flex items-start gap-3">
                <textarea
                  name="rejection_reason"
                  rows={2}
                  placeholder={t.rejectionPH}
                  className="cs-input resize-none flex-1 text-[12px]"
                />
                <button type="submit" className="btn-danger btn-sm shrink-0 mt-0.5">
                  {t.reject}
                </button>
              </div>
            </form>

          </div>
        </div>
      ) : null}

    </div>
  );
}
