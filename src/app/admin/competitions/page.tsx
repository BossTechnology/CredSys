import { createClient } from "@/lib/supabase/server";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDateShort } from "@/lib/utils";
import type { CompetitionStatus } from "@/lib/supabase/types";

type CompetitionRow = {
  id: string;
  title: string;
  industry: string | null;
  status: CompetitionStatus;
  start_date: string | null;
  end_date: string | null;
  entry_count?: number;
  created_at: string;
};

const STATUS_BADGE_MAP: Record<CompetitionStatus, "active" | "pending" | "accredited" | "expired"> = {
  active: "active",
  draft: "pending",
  scoring: "implementing",
  completed: "accredited",
} as never;

export default async function AdminCompetitionsPage() {
  const supabase = await createClient();

  const { data: competitions } = await supabase
    .from("competitions")
    .select("*")
    .order("created_at", { ascending: false });

  const total = competitions?.length ?? 0;
  const active = competitions?.filter((c) => c.status === "active").length ?? 0;

  const columns: Column<CompetitionRow>[] = [
    {
      key: "title",
      label: "Competition",
      render: (_, row) => (
        <div>
          <div className="font-semibold text-[8px]">{row.title}</div>
          {row.industry && (
            <div className="text-cs-400 text-[7px] font-mono">{row.industry}</div>
          )}
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (v) => <Badge variant={STATUS_BADGE_MAP[v as CompetitionStatus] as never} />,
    },
    {
      key: "start_date",
      label: "Start",
      render: (v) => (
        <span className="font-mono text-cs-500 text-[7px]">
          {v ? formatDateShort(v as string) : "—"}
        </span>
      ),
    },
    {
      key: "end_date",
      label: "End",
      render: (v) => (
        <span className="font-mono text-cs-500 text-[7px]">
          {v ? formatDateShort(v as string) : "—"}
        </span>
      ),
    },
    {
      key: "id",
      label: "Actions",
      render: (_, row) => (
        <div className="flex gap-2">
          <Button variant="outline" size="sm">Manage →</Button>
          {row.status === "active" && (
            <Button variant="ghost" size="sm">Score</Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-[1280px] mx-auto px-7 py-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold">Competitions</h1>
          <p className="text-[8px] font-mono text-cs-400 uppercase tracking-widest mt-1">
            Competition Management
          </p>
        </div>
        <Button variant="accent">+ New Competition</Button>
      </div>

      <div className="flex gap-3 text-[8px] font-mono mb-4">
        <span><strong>{total}</strong> Total</span>
        <span className="text-cs-300">·</span>
        <span className="text-sb-text"><strong>{active}</strong> Active</span>
      </div>

      <DataTable
        columns={columns}
        data={(competitions ?? []) as CompetitionRow[]}
        rowKey="id"
        title="Competition Roster"
        emptyMessage="No competitions yet."
      />
    </div>
  );
}
