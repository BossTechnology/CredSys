import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { WorkflowStatusBar } from "@/components/ui/WorkflowStatusBar";
import { SectionDivider, MetricStrip } from "@/components/ui/SectionDivider";
import { DataTable } from "@/components/ui/DataTable";
import { StatGrid, StatCard } from "@/components/ui/Dashboard";
import { formatDateShort } from "@/lib/utils";
import type { AccreditationRequest, AccreditationStatus } from "@/lib/supabase/types";

export default async function EvaluatorDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: assignments } = await supabase
    .from("accreditation_requests")
    .select("*, startup:startup_id(org_name,email,industry)")
    .eq("evaluator_id", user.id)
    .order("updated_at", { ascending: false });

  const total = assignments?.length ?? 0;
  const active = assignments?.filter((a) => !["accredited", "rejected", "expired"].includes(a.status)).length ?? 0;
  const accredited = assignments?.filter((a) => a.status === "accredited").length ?? 0;
  const pending = assignments?.filter((a) => a.status === "assigned").length ?? 0;

  const columns = [
    {
      key: "startup",
      label: "Startup",
      render: (_: unknown, row: AccreditationRequest) => (
        <div>
          <div className="font-semibold">{(row as unknown as { startup: { org_name: string } }).startup?.org_name}</div>
          <div className="text-cs-400">{(row as unknown as { startup: { email: string } }).startup?.email}</div>
        </div>
      ),
    },
    {
      key: "startup",
      label: "Industry",
      render: (_: unknown, row: AccreditationRequest) => (
        <span>{(row as unknown as { startup: { industry: string } }).startup?.industry ?? "—"}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (v: unknown) => <Badge variant={v as AccreditationStatus} />,
    },
    {
      key: "updated_at",
      label: "Updated",
      render: (v: unknown) => (
        <span className="font-mono text-cs-500">{formatDateShort(v as string)}</span>
      ),
    },
    {
      key: "id",
      label: "Actions",
      render: (_: unknown, row: AccreditationRequest) => (
        <Link href={`/evaluator/assignments/${row.id}`}>
          <Button variant="outline" size="sm">View →</Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="max-w-[1280px] mx-auto px-7 py-6">
      {/* Stats */}
      <div className="mb-5">
        <SectionDivider label="Evaluator Overview" className="mb-3" />
        <StatGrid cols={4}>
          <StatCard value={total} label="Total Assignments" />
          <StatCard value={active} label="Active" alert={active > 0} alertText={active > 0 ? "In Progress" : undefined} />
          <StatCard value={accredited} label="Accredited" accent />
          <StatCard value={pending} label="Pending Action" alert={pending > 0} alertText={pending > 0 ? "Action Needed" : undefined} />
        </StatGrid>
      </div>

      {/* Assignments table */}
      <DataTable
        columns={columns as never}
        data={(assignments ?? []) as never[]}
        rowKey="id"
        title="My Assignments"
        subtitle={`${total} Total`}
        isAlertRow={(row: unknown) =>
          (row as AccreditationRequest).status === "assigned"
        }
        emptyMessage="No assignments yet. You will be notified when a startup is assigned to you."
      />
    </div>
  );
}
