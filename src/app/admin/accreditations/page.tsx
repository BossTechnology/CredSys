import { createClient } from "@/lib/supabase/server";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDateShort } from "@/lib/utils";
import { AssignEvaluatorForm } from "@/components/admin/AssignEvaluatorForm";
import type { AccreditationStatus } from "@/lib/supabase/types";

export default async function AdminAccreditationsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("accreditation_requests")
    .select("*, startup:startup_id(org_name,email), evaluator:evaluator_id(org_name)")
    .order("updated_at", { ascending: false });

  if (filter === "unassigned") {
    query = query.is("evaluator_id", null).eq("status", "submitted");
  }

  const [{ data: requests }, { data: evaluators }] = await Promise.all([
    query,
    supabase
      .from("profiles")
      .select("user_id,org_name")
      .eq("role", "evaluator")
      .eq("is_active", true),
  ]);

  type Row = {
    id: string;
    status: AccreditationStatus;
    startup: { org_name: string; email: string };
    evaluator: { org_name: string } | null;
    updated_at: string;
  };

  const columns: Column<Row>[] = [
    {
      key: "startup",
      label: "Startup",
      render: (_, row) => (
        <div>
          <div className="font-semibold text-[8px]">{row.startup?.org_name}</div>
          <div className="text-cs-400 text-[7px] font-mono">{row.startup?.email}</div>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (v) => <Badge variant={v as AccreditationStatus} />,
    },
    {
      key: "evaluator",
      label: "Evaluator",
      render: (_, row) =>
        row.evaluator ? (
          <span className="text-[8px] font-semibold">{row.evaluator.org_name}</span>
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
          {!row.evaluator && (
            <AssignEvaluatorForm
              requestId={row.id}
              evaluators={evaluators ?? []}
            />
          )}
          {row.evaluator && (
            <Button variant="ghost" size="sm">Reassign</Button>
          )}
        </div>
      ),
    },
  ];

  const total = requests?.length ?? 0;
  const unassigned = requests?.filter((r) => !r.evaluator_id).length ?? 0;

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
        data={(requests ?? []) as Row[]}
        rowKey="id"
        title={`Accreditation Pipeline · All Statuses · ${total} Shown`}
        isAlertRow={(row) => !row.evaluator}
        emptyMessage="No accreditation requests found."
      />
    </div>
  );
}
