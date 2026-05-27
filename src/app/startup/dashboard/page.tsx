import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { WorkflowStatusBar } from "@/components/ui/WorkflowStatusBar";
import { CredBadge } from "@/components/ui/CredBadge";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { AlertBox } from "@/components/ui/AlertBox";
import { formatDate } from "@/lib/utils";
import type { AccreditationStatus } from "@/lib/supabase/types";

export default async function StartupDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createServiceClient();
  const [{ data: profile }, { data: requests }] = await Promise.all([
    admin.from("profiles").select("*").eq("user_id", user.id).single(),
    admin
      .from("accreditation_requests")
      .select("*")
      .eq("startup_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const allRequests = requests ?? [];
  const latest = allRequests[0];
  const status = latest?.status as AccreditationStatus | undefined;
  const isAccredited = status === "accredited";

  // Get evaluator name if assigned
  let evaluatorName: string | null = null;
  if (latest?.evaluator_id) {
    const { data: ev } = await admin
      .from("profiles")
      .select("org_name")
      .eq("user_id", latest.evaluator_id)
      .single();
    evaluatorName = ev?.org_name ?? null;
  }

  return (
    <div className="max-w-[840px] mx-auto px-7 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{profile?.org_name ?? "My Startup"}</h1>
        <p className="text-[8px] font-mono text-cs-400 uppercase tracking-widest mt-1">
          Startup Dashboard
        </p>
      </div>

      {!profile?.is_active && (
        <AlertBox variant="accent" title="Account pending activation." className="mb-4">
          Our team is reviewing your profile. You will be notified when your account is activated.
        </AlertBox>
      )}

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
          <div className="px-4 py-3 flex items-center justify-between border-b border-cs-200">
            <div>
              <div className="text-[8px] font-mono text-cs-400 uppercase tracking-widest mb-1">
                Current Status
              </div>
              <Badge variant={status!} />
            </div>
            <div className="text-right">
              <div className="text-[8px] font-mono text-cs-400 uppercase tracking-widest mb-1">
                Submitted
              </div>
              <div className="text-[8px] font-mono text-cs-600">
                {formatDate(latest.created_at)}
              </div>
            </div>
            {evaluatorName && (
              <div className="text-right">
                <div className="text-[8px] font-mono text-cs-400 uppercase tracking-widest mb-1">
                  Evaluator
                </div>
                <div className="text-[8px] font-mono font-semibold">
                  {evaluatorName}
                </div>
              </div>
            )}
          </div>

          {status && ["assigned", "interview", "implementing", "verifying", "accredited"].includes(status) && (
            <div className="px-4 py-3">
              <WorkflowStatusBar currentStatus={status} />
            </div>
          )}
        </div>
      )}

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

          {/* Embeddable badge section */}
          <div className="mt-4 border border-cs-200 bg-white p-4">
            <p className="text-[8px] font-mono font-semibold text-cs-600 uppercase tracking-widest mb-3">
              Embed on Your Website
            </p>
            <img
              src={`/api/badge/${latest.unique_code}`}
              alt="StartupCred Badge"
              className="mb-3 border border-cs-100"
              style={{ width: 320, height: 100 }}
            />
            <div className="bg-cs-50 border border-cs-200 px-3 py-2 rounded-none">
              <p className="text-[7px] font-mono text-cs-400 uppercase tracking-widest mb-1">HTML Embed Code</p>
              <code className="text-[7.5px] font-mono text-cs-700 break-all select-all block leading-relaxed">
                {`<a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://cred-sys.vercel.app"}/verify/${latest.unique_code}" target="_blank" rel="noopener noreferrer"><img src="${process.env.NEXT_PUBLIC_APP_URL ?? "https://cred-sys.vercel.app"}/api/badge/${latest.unique_code}" alt="StartupCred Accredited" width="320" height="100"/></a>`}
              </code>
            </div>
            <p className="text-[7px] font-mono text-cs-400 mt-2">
              ↗ <a href={`/verify/${latest.unique_code}`} target="_blank" rel="noopener noreferrer" className="underline hover:text-black">
                View public verification page
              </a>
            </p>
          </div>
        </>
      )}

      {allRequests.length > 1 && (
        <>
          <SectionDivider label="Request History" className="mt-6 mb-3" />
          <div className="border border-cs-200 divide-y divide-cs-100">
            {allRequests.map((req) => (
              <div key={req.id} className="px-4 py-2 flex items-center justify-between">
                <span className="text-[8px] font-mono text-cs-500">
                  {formatDate(req.created_at)}
                </span>
                <Badge variant={req.status as AccreditationStatus} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
