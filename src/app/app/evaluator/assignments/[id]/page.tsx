import { createClient }        from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect, notFound }  from "next/navigation";
import Link                    from "next/link";
import { Badge }               from "@/components/ui/Badge";
import { WorkflowStatusBar }   from "@/components/ui/WorkflowStatusBar";
import { VerificationPanel }   from "@/components/accreditation/VerificationPanel";
import { advanceAccreditationStatus } from "@/app/actions/accreditation";
import { rejectWithReason }           from "@/app/actions/verification";
import type { AccreditationStatus, BLIPSVerification, ADDISVerification } from "@/lib/supabase/types";

// ─── Workflow map ─────────────────────────────────────────────────────────────

const NEXT_STATUS: Partial<Record<AccreditationStatus, AccreditationStatus>> = {
  evaluator_assigned:         "meeting_scheduled",
  meeting_scheduled:          "chass1s_shared",
  chass1s_shared:             "implementation_in_progress",
  implementation_in_progress: "ready_for_verification",
  ready_for_verification:     "verification_in_progress",
  verification_in_progress:   "accredited",
};

const ACTION_LABELS: Partial<Record<AccreditationStatus, string>> = {
  evaluator_assigned:         "Confirm Meeting Scheduled",
  meeting_scheduled:          "Confirm CHASS1S Framework Shared",
  chass1s_shared:             "Mark Implementation In Progress",
  implementation_in_progress: "Mark Ready for Verification",
  ready_for_verification:     "Begin Verification",
  verification_in_progress:   "Approve & Accredit",
};

const TERMINAL: AccreditationStatus[] = ["accredited", "rejected", "expired"];

// Form action wrapper — strips the { error } return so <form action> is happy
async function rejectAction(fd: FormData) {
  "use server";
  await rejectWithReason(fd);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en", {
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
  const actionLabel= ACTION_LABELS[status];
  const isTerminal = TERMINAL.includes(status);

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
    <div className="max-w-[860px] mx-auto px-7 py-8">

      {/* Back */}
      <Link
        href="/app/evaluator/dashboard"
        className="text-[7.5px] font-mono text-cs-400 uppercase tracking-widest hover:text-black transition-colors block mb-6"
      >
        ← Back to Dashboard
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="text-[8px] font-mono text-cs-400 uppercase tracking-widest mb-1">
            Assignment Detail
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{req.startup_name}</h1>
          <p className="text-[8px] font-mono text-cs-500 mt-1">{req.startup_email}</p>
        </div>
        <Badge variant={status} />
      </div>

      {/* Workflow bar */}
      {!isTerminal && (
        <div className="mb-6">
          <WorkflowStatusBar currentStatus={status} />
        </div>
      )}

      {/* Accredited credential banner */}
      {status === "accredited" && credCode && (
        <div className="bg-sb-light border border-sb-default px-5 py-3 mb-6 flex items-center justify-between">
          <div>
            <div className="text-[7px] font-mono text-sb-text uppercase tracking-widest mb-0.5">
              Accredited
            </div>
            <div className="text-[8px] font-mono font-semibold tracking-widest">
              {credCode.toUpperCase()}
            </div>
          </div>
          <Link
            href={`/startup/${credCode}`}
            target="_blank"
            className="text-[7.5px] font-mono text-sb-text underline underline-offset-2 hover:opacity-80"
          >
            View Credential →
          </Link>
        </div>
      )}

      {/* BLIPS / ADDIS verification panel */}
      {(status === "verification_in_progress" ||
        status === "ready_for_verification"    ||
        status === "accredited") && (
        <div className="mb-6">
          <div className="flex items-center mb-3">
            <span className="text-[7.5px] font-mono text-cs-400 uppercase tracking-widest border-b border-cs-200 pb-1 flex-1">
              BLIPS / ADDIS Verification
            </span>
          </div>
          <VerificationPanel
            requestId={req.id}
            initialBLIPS={(req.blips_verification as BLIPSVerification) ?? {}}
            initialADDIS={(req.addis_verification as ADDISVerification) ?? {}}
            initialNotes={req.evaluator_notes}
            readOnly={status !== "verification_in_progress"}
          />
        </div>
      )}

      {/* Startup snapshot */}
      <div className="border border-cs-200 bg-white mb-6">
        <div className="px-5 py-2 border-b border-cs-200 bg-cs-50">
          <span className="text-[7.5px] font-mono text-cs-400 uppercase tracking-widest">
            Startup Profile
          </span>
        </div>
        <div className="p-5 grid grid-cols-2 gap-x-8 gap-y-4">
          {[
            { label: "Industry",    value: req.industry  },
            { label: "Stage",       value: req.stage     },
            { label: "Country",     value: req.country   },
            { label: "Website",     value: req.website   },
            { label: "Team Size",   value: req.team_size },
            { label: "Submitted",   value: fmt(req.created_at) },
          ].map((f) => (
            <div key={f.label}>
              <div className="text-[6.5px] font-mono text-cs-400 uppercase tracking-widest mb-0.5">
                {f.label}
              </div>
              <div className="text-[8px] font-semibold">
                {f.value ? String(f.value) : "—"}
              </div>
            </div>
          ))}

          {req.description && (
            <div className="col-span-2">
              <div className="text-[6.5px] font-mono text-cs-400 uppercase tracking-widest mb-0.5">
                Description
              </div>
              <p className="text-[8px] text-cs-700 leading-relaxed">{req.description}</p>
            </div>
          )}
          {req.problem && (
            <div className="col-span-2">
              <div className="text-[6.5px] font-mono text-cs-400 uppercase tracking-widest mb-0.5">
                Problem
              </div>
              <p className="text-[8px] text-cs-700 leading-relaxed">{req.problem}</p>
            </div>
          )}
          {req.traction && (
            <div className="col-span-2">
              <div className="text-[6.5px] font-mono text-cs-400 uppercase tracking-widest mb-0.5">
                Traction
              </div>
              <p className="text-[8px] text-cs-700 leading-relaxed">{req.traction}</p>
            </div>
          )}
          {req.demo_url && (
            <div>
              <div className="text-[6.5px] font-mono text-cs-400 uppercase tracking-widest mb-0.5">
                Demo
              </div>
              <a href={req.demo_url} target="_blank" rel="noopener noreferrer"
                 className="text-[8px] text-black underline underline-offset-2 break-all">
                {req.demo_url}
              </a>
            </div>
          )}
          {req.pitch_deck_url && (
            <div>
              <div className="text-[6.5px] font-mono text-cs-400 uppercase tracking-widest mb-0.5">
                Pitch Deck
              </div>
              <a href={req.pitch_deck_url} target="_blank" rel="noopener noreferrer"
                 className="text-[8px] text-black underline underline-offset-2 break-all">
                {req.pitch_deck_url}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Evaluator actions */}
      {!isTerminal && nextStatus && (
        <div className="border border-cs-200 bg-white">
          <div className="px-5 py-2 border-b border-cs-200 bg-cs-50">
            <span className="text-[7.5px] font-mono text-cs-400 uppercase tracking-widest">
              Evaluator Actions
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
                <span className="text-[7px] font-mono text-cs-400">
                  Save verification progress first, then accredit.
                </span>
              )}
            </div>

            {/* Reject with reason */}
            <form action={rejectAction} className="border-t border-cs-100 pt-4 flex flex-col gap-2">
              <input type="hidden" name="request_id" value={req.id} />
              <label className="text-[7px] font-mono text-cs-400 uppercase tracking-widest">
                Rejection Reason (optional)
              </label>
              <div className="flex items-start gap-3">
                <textarea
                  name="rejection_reason"
                  rows={2}
                  placeholder="Explain why the application is being rejected…"
                  className="cs-input resize-none flex-1 text-[7.5px]"
                />
                <button type="submit" className="btn-danger btn-sm shrink-0 mt-0.5">
                  Reject
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
