import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { WorkflowStatusBar } from "@/components/ui/WorkflowStatusBar";
import { CredBadge } from "@/components/ui/CredBadge";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { AlertBox } from "@/components/ui/AlertBox";
import { formatDate } from "@/lib/utils";
import type { AccreditationRequest } from "@/lib/supabase/types";

export default async function StartupDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: requests }] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", user.id).single(),
    supabase
      .from("accreditation_requests")
      .select("*, evaluator:evaluator_id(org_name,email)")
      .eq("startup_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const latest = requests?.[0] as AccreditationRequest | undefined;
  const isAccredited = latest?.status === "accredited";

  return (
    <div className="max-w-[840px] mx-auto px-7 py-8">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{profile?.org_name ?? "My Startup"}</h1>
        <p className="text-[8px] font-mono text-cs-400 uppercase tracking-widest mt-1">
          Startup Dashboard
        </p>
      </div>

      {/* Pending activation warning */}
      {!profile?.is_active && (
        <AlertBox variant="accent" title="Account pending activation." className="mb-4">
          Our team is reviewing your profile. You will be notified when your account is activated.
        </AlertBox>
      )}

      {/* Accreditation status */}
      <SectionDivider label="Accreditation Status" className="mb-3" />

      {!latest ? (
        <div className="border border-cs-200 bg-white px-6 py-8 text-center">
          <p className="text-[9px] font-mono text-cs-400 mb-4">
            You have not submitted an accreditation request yet.
          </p>
          <Link href="/startup/apply">
            <Button>Apply for Accreditation</Button>
          </Link>
        </div>
      ) : (
        <div className="border border-cs-200 bg-white">
          {/* Status row */}
          <div className="px-4 py-3 flex items-center justify-between border-b border-cs-200">
            <div>
              <div className="text-[8px] font-mono text-cs-400 uppercase tracking-widest mb-1">
                Current Status
              </div>
              <Badge variant={latest.status} />
            </div>
            <div className="text-right">
              <div className="text-[8px] font-mono text-cs-400 uppercase tracking-widest mb-1">
                Submitted
              </div>
              <div className="text-[8px] font-mono text-cs-600">
                {formatDate(latest.created_at)}
              </div>
            </div>
            {latest.evaluator && (
              <div className="text-right">
                <div className="text-[8px] font-mono text-cs-400 uppercase tracking-widest mb-1">
                  Evaluator
                </div>
                <div className="text-[8px] font-mono font-semibold">
                  {(latest.evaluator as { org_name: string }).org_name}
                </div>
              </div>
            )}
          </div>

          {/* Workflow bar */}
          {["assigned", "interview", "implementing", "verifying", "accredited"].includes(
            latest.status
          ) && (
            <div className="px-4 py-3">
              <WorkflowStatusBar currentStatus={latest.status} />
            </div>
          )}
        </div>
      )}

      {/* StartupCred Badge */}
      {isAccredited && latest?.unique_code && (
        <>
          <SectionDivider label="Your StartupCred Badge" variant="accent" className="mt-6 mb-3" />
          <div className="flex items-start gap-6">
            <CredBadge
              startupName={profile?.org_name ?? ""}
              uniqueCode={latest.unique_code}
              accreditedAt={latest.accredited_at ?? latest.updated_at}
            />
            <div className="text-[8px] font-mono text-cs-500 leading-relaxed mt-2">
              <p className="font-semibold text-black mb-1">Credential Active</p>
              <p>ID: {latest.unique_code}</p>
              <p>Issued: {formatDate(latest.accredited_at ?? latest.updated_at)}</p>
              {latest.expires_at && <p>Expires: {formatDate(latest.expires_at)}</p>}
            </div>
          </div>
        </>
      )}

      {/* Request history */}
      {requests && requests.length > 1 && (
        <>
          <SectionDivider label="Request History" className="mt-6 mb-3" />
          <div className="border border-cs-200 divide-y divide-cs-100">
            {requests.map((req) => (
              <div key={req.id} className="px-4 py-2 flex items-center justify-between">
                <span className="text-[8px] font-mono text-cs-500">
                  {formatDate(req.created_at)}
                </span>
                <Badge variant={(req as AccreditationRequest).status} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
