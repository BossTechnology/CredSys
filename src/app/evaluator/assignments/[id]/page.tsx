import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect, notFound } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { WorkflowStatusBar } from "@/components/ui/WorkflowStatusBar";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { formatDate } from "@/lib/utils";
import { advanceAccreditationStatus } from "@/app/actions/accreditation";
import type { AccreditationStatus } from "@/lib/supabase/types";

const NEXT_STATUS: Partial<Record<AccreditationStatus, AccreditationStatus>> = {
  assigned: "interview",
  interview: "implementing",
  implementing: "verifying",
  verifying: "accredited",
};

const ACTION_LABELS: Partial<Record<AccreditationStatus, string>> = {
  assigned: "Start Interview",
  interview: "Begin Implementation Review",
  implementing: "Move to Verification",
  verifying: "Approve & Accredit",
};

export default async function AssignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: req } = await admin
    .from("accreditation_requests")
    .select("*")
    .eq("id", id)
    .eq("evaluator_id", user.id)
    .single();

  if (!req) notFound();

  const status = req.status as AccreditationStatus;
  const nextStatus = NEXT_STATUS[status];
  const actionLabel = ACTION_LABELS[status];

  return (
    <div className="max-w-[840px] mx-auto px-7 py-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="text-[8px] font-mono text-cs-400 uppercase tracking-widest mb-1">
            Assignment Detail
          </div>
          <h1 className="text-2xl font-bold">{req.startup_org_name}</h1>
          <p className="text-[8px] font-mono text-cs-500 mt-1">{req.startup_email}</p>
        </div>
        <Badge variant={status} />
      </div>

      {["assigned", "interview", "implementing", "verifying", "accredited"].includes(status) && (
        <WorkflowStatusBar currentStatus={status} className="mb-5" />
      )}

      <SectionDivider label="Startup Profile" className="mb-3" />
      <div className="border border-cs-200 bg-white p-4 grid grid-cols-2 gap-4 mb-5">
        {[
          { label: "Organization", value: req.startup_org_name },
          { label: "Industry", value: req.industry },
          { label: "Country", value: req.country ?? "—" },
          { label: "Website", value: req.website ?? "—" },
          { label: "Stage", value: req.stage ?? "—" },
          { label: "Team Size", value: req.team_size ?? "—" },
          { label: "Submitted", value: formatDate(req.created_at) },
          { label: "Last Updated", value: formatDate(req.updated_at) },
        ].map((item) => (
          <div key={item.label}>
            <div className="text-[6.5px] font-mono text-cs-400 uppercase tracking-widest mb-0.5">
              {item.label}
            </div>
            <div className="text-[9px] font-semibold">{String(item.value)}</div>
          </div>
        ))}
        {req.description && (
          <div className="col-span-2">
            <div className="text-[6.5px] font-mono text-cs-400 uppercase tracking-widest mb-0.5">
              Description
            </div>
            <div className="text-[8px] text-cs-700 leading-relaxed">{req.description}</div>
          </div>
        )}
        {req.problem && (
          <div className="col-span-2">
            <div className="text-[6.5px] font-mono text-cs-400 uppercase tracking-widest mb-0.5">
              Problem
            </div>
            <div className="text-[8px] text-cs-700 leading-relaxed">{req.problem}</div>
          </div>
        )}
        {req.traction && (
          <div className="col-span-2">
            <div className="text-[6.5px] font-mono text-cs-400 uppercase tracking-widest mb-0.5">
              Traction
            </div>
            <div className="text-[8px] text-cs-700 leading-relaxed">{req.traction}</div>
          </div>
        )}
      </div>

      {status !== "accredited" && status !== "rejected" && status !== "expired" && nextStatus && (
        <>
          <SectionDivider label="Evaluator Actions" variant="accent" className="mb-3" />
          <div className="border border-cs-200 bg-white p-4 flex items-center gap-4">
            <form action={advanceAccreditationStatus}>
              <input type="hidden" name="request_id" value={req.id} />
              <input type="hidden" name="next_status" value={nextStatus} />
              <Button type="submit" variant={nextStatus === "accredited" ? "accent" : "primary"}>
                {actionLabel}
              </Button>
            </form>
            <form action={advanceAccreditationStatus}>
              <input type="hidden" name="request_id" value={req.id} />
              <input type="hidden" name="next_status" value="rejected" />
              <Button type="submit" variant="danger">Reject</Button>
            </form>
          </div>
        </>
      )}

      {status === "accredited" && req.unique_code && (
        <div className="bg-sb-light border border-sb-default px-4 py-3 text-[8px] font-mono text-sb-text">
          <strong>Accredited</strong> — Credential ID: {req.unique_code} · Issued: {formatDate(req.accredited_at ?? req.updated_at)}
        </div>
      )}
    </div>
  );
}
