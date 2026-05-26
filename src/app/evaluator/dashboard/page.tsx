import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { StatGrid, StatCard } from "@/components/ui/Dashboard";
import { formatDateShort } from "@/lib/utils";
import type { AccreditationStatus } from "@/lib/supabase/types";

type Row = {
  id: string;
  status: AccreditationStatus;
  startup_id: string;
  startup_org_name: string;
  startup_email: string;
  industry: string;
  updated_at: string;
};

export default async function EvaluatorDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: assignments } = await admin
    .from("accreditation_requests")
    .select("id,status,startup_id,startup_org_name,startup_email,industry,updated_at")
    .eq("evaluator_id", user.id)
    .order("updated_at", { ascending: false });

  const rows = (assignments ?? []) as Row[];
  const total = rows.length;
  const active = rows.filter((a) => !["accredited", "rejected", "expired"].includes(a.status)).length;
  const accredited = rows.filter((a) => a.status === "accredited").length;
  const pending = rows.filter((a) => a.status === "assigned").length;

  const columns: Column<Row>[] = [
    {
      key: "startup_org_name",
      label: "Startup",
      render: (_, row) => (
        <div>
          <div className="font-semibold text-[8px]">{row.startup_org_name}</div>
          <div className="text-cs-400 text-[7px] font-mono">{row.startup_email}</div>
        </div>
      ),
    },
    {
      key: "industry",
      label: "Industry",
      render: (v) => <span className="capitalize">{String(v ?? "—")}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (v) => <Badge variant={v as AccreditationStatus} />,
    },
    {
      key: "updated_at",
      label: "Updated",
      render: (v) => (
        <span className="font-mono text-cs-500 text-[7px]">{formatDateShort(v as string)}</span>
      ),
    },
    {
      key: "id",
      label: "Actions",
      render: (_, row) => (
        <Link href={`/evaluator/assignments/${row.id}`}>
          <Button variant="outline" size="sm">View →</Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="max-w-[1280px] mx-auto px-7 py-6">
      <div className="mb-5">
        <h1 className="text-2xl font-bold">Evaluator Dashboard</h1>
        <p className="text-[8px] font-mono text-cs-400 uppercase tracking-widest mt-1">
          My Assignments
        </p>
      </div>

      <div className="mb-5">
        <SectionDivider label="Overview" className="mb-3" />
        <StatGrid cols={4}>
          <StatCard value={total} label="Total Assignments" />
          <StatCard value={active} label="Active" alert={active > 0} alertText={active > 0 ? "In Progress" : undefined} />
          <StatCard value={accredited} label="Accredited" accent />
          <StatCard value={pending} label="Pending Action" alert={pending > 0} alertText={pending > 0 ? "Action Needed" : undefined} />
        </StatGrid>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        rowKey="id"
        title="My Assignments"
        subtitle={`${total} Total`}
        isAlertRow={(row) => row.status === "assigned"}
        emptyMessage="No assignments yet. You will be notified when a startup is assigned to you."
      />
    </div>
  );
}
