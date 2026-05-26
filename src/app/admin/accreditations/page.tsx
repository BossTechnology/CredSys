import { createAdminClient } from "@/lib/supabase/admin";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDateShort } from "@/lib/utils";
import { AssignEvaluatorForm } from "@/components/admin/AssignEvaluatorForm";
import type { AccreditationStatus } from "@/lib/supabase/types";

type Row = {
  id: string;
  status: AccreditationStatus;
  startup_id: string;
  evaluator_id: string | null;
  startup_org_name: string;
  startup_email: string;
  updated_at: string;
  evaluator_org_name: string | null;
};

export default async function AdminAccreditationsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const supabase = createAdminClient();

  let query = supabase
    .from("accreditation_requests")
    .select("id,status,startup_id,evaluator_id,startup_org_name,startup_email,updated_at")
    .order("updated_at", { ascending: false });

  if (filter === "unassigned") {
    query = query.is("evaluator_id", null).eq("status", "submitted");
  }

  const [{ data: requests }, { data: profiles }] = await Promise.all([
    query,
    supabase.from("profiles").select("user_id,org_name,role,is_active"),
  ]);

  const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));
  const rows: Row[] = (requests ?? []).map((r) => ({
    ...r,
    evaluator_org_name: r.evaluator_id ? profileMap.get(r.evaluator_id)?.org_name ?? null : null,
  }));
  const evaluators = (profiles ?? []).filter((p) => p.role === "evaluator" && p.is_active);

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
      key: "status",
      label: "Status",
      render: (v) => <Badge variant={v as AccreditationStatus} />,
    },
    {
      key: "evaluator_org_name",
      label: "Evaluator",
      render: (v) =>
        v ? (
          <span className="text-[8px] font-semibold">{String(v)}</span>
        ) : (
          <span className="text-cs-red text-[7px] font-mono">— Unassigned</span>
        ),
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
        <div className="flex items-center gap-2">
          {!row.evaluator_id && (
            <AssignEvaluatorForm
              requestId={row.id}
              evaluators={evaluators}
            />
          )}
          {row.evaluator_id && (
            <Button variant="ghost" size="sm">Reassign</Button>
          )}
        </div>
      ),
    },
  ];

  const total = rows.length;
  const unassigned = rows.filter((r) => !r.evaluator_id).length;

  return (
    <div className="max-w-[1280px] mx-auto px-7 py-6">
      <div className="mb-5">
        <h1 className="text-2xl font-bold">Accreditations</h1>
        <p className="text-[8px] font-mono text-cs-400 uppercase tracking-widest mt-1">
          Pipeline Management
        </p>
      </div>

      {unassigned > 0 && (
        <div className="bg-cs-red-100 border-l-4 border-cs-red px-4 py-2 text-[8px] font-mono text-cs-red mb-4">
          ACTION REQUIRED — {unassigned} Unassigned Request{unassigned > 1 ? "s" : ""}
        </div>
      )}

      <DataTable
        columns={columns}
        data={rows}
        rowKey="id"
        title={`Accreditation Pipeline · All Statuses · ${total} Shown`}
        isAlertRow={(row) => !row.evaluator_id}
        emptyMessage="No accreditation requests found."
      />
    </div>
  );
}
