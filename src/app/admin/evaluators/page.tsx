import { createClient } from "@/lib/supabase/server";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatDateShort } from "@/lib/utils";
import { activateEvaluator } from "@/app/actions/admin";

type EvaluatorRow = {
  user_id: string;
  org_name: string;
  email: string;
  country: string | null;
  is_active: boolean;
  created_at: string;
};

export default async function AdminEvaluatorsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("profiles")
    .select("user_id,org_name,email,country,is_active,created_at")
    .eq("role", "evaluator")
    .order("created_at", { ascending: false });

  if (filter === "pending") {
    query = query.eq("is_active", false);
  }

  const { data: evaluators } = await query;

  const total = evaluators?.length ?? 0;
  const pending = evaluators?.filter((e) => !e.is_active).length ?? 0;

  const columns: Column<EvaluatorRow>[] = [
    {
      key: "org_name",
      label: "Organization",
      render: (_, row) => (
        <div>
          <div className="font-semibold text-[8px]">{row.org_name}</div>
          <div className="text-cs-400 text-[7px] font-mono">{row.email}</div>
        </div>
      ),
    },
    {
      key: "country",
      label: "Country",
      render: (v) => <span>{String(v ?? "—")}</span>,
    },
    {
      key: "is_active",
      label: "Status",
      render: (v) => (
        <Badge variant={v ? "active" : "pending"} />
      ),
    },
    {
      key: "created_at",
      label: "Joined",
      render: (v) => (
        <span className="font-mono text-cs-500 text-[7px]">{formatDateShort(v as string)}</span>
      ),
    },
    {
      key: "user_id",
      label: "Actions",
      render: (_, row) =>
        !row.is_active ? (
          <form action={activateEvaluator}>
            <input type="hidden" name="user_id" value={row.user_id} />
            <Button type="submit" variant="primary" size="sm">Activate</Button>
          </form>
        ) : (
          <form action={activateEvaluator}>
            <input type="hidden" name="user_id" value={row.user_id} />
            <input type="hidden" name="deactivate" value="true" />
            <Button type="submit" variant="danger" size="sm">Deactivate</Button>
          </form>
        ),
    },
  ];

  return (
    <div className="max-w-[1280px] mx-auto px-7 py-6">
      <div className="mb-5">
        <h1 className="text-2xl font-bold">Evaluators</h1>
        <p className="text-[8px] font-mono text-cs-400 uppercase tracking-widest mt-1">
          Evaluator Management
        </p>
      </div>

      {pending > 0 && (
        <div className="bg-sb-light border border-sb-default px-4 py-2 text-[8px] font-mono text-sb-text mb-4">
          <strong>{pending}</strong> evaluator{pending > 1 ? "s" : ""} pending activation.
        </div>
      )}

      <DataTable
        columns={columns}
        data={(evaluators ?? []) as EvaluatorRow[]}
        rowKey="user_id"
        title={`Evaluator Management · ${total} Total`}
        isAlertRow={(row) => !row.is_active}
        emptyMessage="No evaluators found."
      />
    </div>
  );
}
